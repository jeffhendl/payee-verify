import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendVerificationSms } from '@/lib/twilio';

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

    // Get sender info from user metadata
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
      return NextResponse.json({ error: 'Payee does not have a phone number. Add one on the review page.' }, { status: 400 });
    }

    // Save any pending edits to the payee before sending (the client should save first, but just in case)

    // Create verification record
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .insert({
        payee_id: payeeId,
        invoice_id: invoiceId,
        type: 'sms',
        status: 'pending',
      })
      .select()
      .single();

    if (verificationError || !verification) {
      console.error('Verification creation error:', verificationError);
      return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 });
    }

    // Build the verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify/${verification.token}`;

    // Send the SMS
    try {
      await sendVerificationSms({
        to: payee.contact_phone,
        senderFirstName,
        senderCompany,
        payeeCompany: payee.company_name || 'your company',
        invoiceAmount: payee.invoice_amount || 0,
        currency: payee.currency || 'USD',
        verifyUrl,
      });
    } catch (smsError) {
      console.error('Twilio error:', smsError);
      await supabase
        .from('verifications')
        .update({ status: 'failed' })
        .eq('id', verification.id);
      return NextResponse.json({ error: 'Failed to send verification SMS. Make sure the phone number is in E.164 format (e.g., +14155551234).' }, { status: 500 });
    }

    // Update verification status to sent
    await supabase
      .from('verifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', verification.id);

    // Update invoice status
    await supabase
      .from('invoices')
      .update({ status: 'verification_sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    return NextResponse.json({
      verificationId: verification.id,
      status: 'sent',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
