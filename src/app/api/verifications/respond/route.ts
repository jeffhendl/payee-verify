import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { token, confirmed, respondent_name, respondent_role, discrepancies, banking_details } = await request.json();

    if (!token || typeof confirmed !== 'boolean' || !respondent_name || !respondent_role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up verification by token using service role (public endpoint)
    const { data: verification, error } = await supabaseAdmin
      .from('verifications')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !verification) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This verification link has expired' }, { status: 410 });
    }

    // Check if already responded
    if (verification.status === 'confirmed' || verification.status === 'denied') {
      return NextResponse.json({ error: 'This verification has already been completed' }, { status: 409 });
    }

    const responseData = {
      confirmed,
      discrepancies: discrepancies || null,
      respondent_name,
      respondent_role,
      timestamp: new Date().toISOString(),
      banking_details_provided: !!banking_details,
    };

    // Update verification
    await supabaseAdmin
      .from('verifications')
      .update({
        status: confirmed ? 'confirmed' : 'denied',
        responded_at: new Date().toISOString(),
        response_data: responseData,
      })
      .eq('id', verification.id);

    // If payee provided banking details, update the payee record
    if (banking_details && confirmed) {
      const bankingUpdate: Record<string, string | null> = {};
      if (banking_details.bank_name) bankingUpdate.bank_name = banking_details.bank_name;
      if (banking_details.account_number) bankingUpdate.account_number = banking_details.account_number;
      if (banking_details.aba_routing_number) bankingUpdate.aba_routing_number = banking_details.aba_routing_number;
      if (banking_details.transit_number) bankingUpdate.transit_number = banking_details.transit_number;
      if (banking_details.institution_number) bankingUpdate.institution_number = banking_details.institution_number;
      if (banking_details.account_type) bankingUpdate.account_type = banking_details.account_type;

      if (Object.keys(bankingUpdate).length > 0) {
        bankingUpdate.updated_at = new Date().toISOString();
        await supabaseAdmin
          .from('payees')
          .update(bankingUpdate)
          .eq('id', verification.payee_id);
      }
    }

    // Update invoice status — confirmed goes to pending_review (user must approve), denied goes to denied
    const { error: invoiceUpdateError } = await supabaseAdmin
      .from('invoices')
      .update({
        status: confirmed ? 'pending_review' : 'denied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.invoice_id);

    if (invoiceUpdateError) {
      console.error('Failed to update invoice status:', invoiceUpdateError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
