import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payeeId, invoiceId } = await request.json();

    if (!payeeId || !invoiceId) {
      return NextResponse.json({ error: 'payeeId and invoiceId are required' }, { status: 400 });
    }

    // Get sender info
    const senderFirstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'Someone';
    const senderCompany = user.user_metadata?.company_name || 'a company';

    // Fetch the payee
    const { data: payee, error: payeeError } = await supabase
      .from('payees')
      .select('*')
      .eq('id', payeeId)
      .single();

    if (payeeError || !payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    if (!payee.contact_phone) {
      return NextResponse.json({ error: 'Payee does not have a phone number' }, { status: 400 });
    }

    // Create verification record
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .insert({
        payee_id: payeeId,
        invoice_id: invoiceId,
        type: 'phone',
        status: 'pending',
      })
      .select()
      .single();

    if (verificationError || !verification) {
      console.error('Verification creation error:', verificationError);
      return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 });
    }

    // Build the verification URL (fallback for SMS after call)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify/${verification.token}`;

    // Call Retell AI to initiate outbound call
    const retellApiKey = process.env.RETELL_API_KEY;
    const retellAgentId = process.env.RETELL_AGENT_ID;
    const fromNumber = process.env.RETELL_FROM_NUMBER;

    if (!retellApiKey || !retellAgentId || !fromNumber) {
      console.error('Missing Retell env vars');
      await supabase
        .from('verifications')
        .update({ status: 'failed' })
        .eq('id', verification.id);
      return NextResponse.json({ error: 'AI calling is not configured' }, { status: 500 });
    }

    const retellRes = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retellApiKey}`,
      },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: payee.contact_phone,
        override_agent_id: retellAgentId,
        retell_llm_dynamic_variables: {
          payee_company: payee.company_name || 'the vendor',
          payee_contact: payee.contact_name || 'the payee',
          sender_name: senderFirstName,
          sender_company: senderCompany,
          invoice_number: payee.invoice_number || 'unknown',
          invoice_amount: `${payee.currency || 'USD'} ${payee.invoice_amount || 'unknown'}`,
          verify_url: verifyUrl,
          scenario: payee.account_number ? 'A' : 'B',
          has_bank_details: payee.account_number ? 'true' : 'false',
          last_four_account: payee.account_number ? payee.account_number.slice(-4) : '',
          country: payee.country || 'US',
          bank_country: payee.country || 'US',
          payment_rail: payee.payment_rail || 'unknown',
        },
        metadata: {
          verification_id: verification.id,
          invoice_id: invoiceId,
          payee_id: payeeId,
        },
      }),
    });

    if (!retellRes.ok) {
      const retellError = await retellRes.json().catch(() => ({}));
      console.error('Retell API error:', retellRes.status, retellError);
      await supabase
        .from('verifications')
        .update({ status: 'failed' })
        .eq('id', verification.id);
      return NextResponse.json({ error: 'Failed to initiate AI call' }, { status: 500 });
    }

    const retellData = await retellRes.json();

    // Update verification with call info
    await supabase
      .from('verifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        response_data: { call_id: retellData.call_id, call_type: 'ai_phone' },
      })
      .eq('id', verification.id);

    // Update invoice status
    await supabase
      .from('invoices')
      .update({ status: 'verification_sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    return NextResponse.json({
      verificationId: verification.id,
      callId: retellData.call_id,
      status: 'sent',
    });
  } catch (error) {
    console.error('Call verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
