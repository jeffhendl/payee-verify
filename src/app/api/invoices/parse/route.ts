import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseInvoice } from '@/lib/claude';
import { matchKnownPayee } from '@/lib/known-payee-matching';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    // Fetch the invoice record
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Update status to parsing
    await supabase
      .from('invoices')
      .update({ status: 'parsing', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(invoice.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from('invoices')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
      return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Parse with Claude
    let parsed;
    try {
      parsed = await parseInvoice(base64);
    } catch (parseError) {
      console.error('Claude parsing error:', parseError);
      await supabase
        .from('invoices')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
      return NextResponse.json({ error: 'Failed to parse invoice. The PDF may not contain recognizable invoice data.' }, { status: 422 });
    }

    // Save raw extracted data to invoice
    await supabase
      .from('invoices')
      .update({
        raw_extracted: parsed,
        status: 'parsed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    // Create a payee record from the extracted data
    const { data: payee, error: payeeError } = await supabase
      .from('payees')
      .insert({
        invoice_id: invoiceId,
        company_name: parsed.payee.company_name,
        contact_name: parsed.payee.contact_name,
        contact_email: parsed.payee.contact_email,
        contact_phone: parsed.payee.contact_phone,
        address_line1: parsed.payee.address_line1,
        address_line2: parsed.payee.address_line2,
        city: parsed.payee.city,
        state_province: parsed.payee.state_province,
        postal_code: parsed.payee.postal_code,
        country: parsed.payee.country || 'US',
        payment_rail: parsed.payee.payment_rail || null,
        aba_routing_number: parsed.payee.aba_routing_number,
        account_number: parsed.payee.account_number,
        transit_number: parsed.payee.transit_number,
        institution_number: parsed.payee.institution_number,
        swift_code: parsed.payee.swift_code || null,
        iban: parsed.payee.iban || null,
        sort_code: parsed.payee.sort_code || null,
        bank_name: parsed.payee.bank_name,
        account_type: parsed.payee.account_type,
        intermediary_bank_detected: parsed.payee.intermediary_bank_detected || false,
        invoice_number: parsed.payee.invoice_number,
        invoice_amount: parsed.payee.invoice_amount,
        invoice_date: parsed.payee.invoice_date,
        due_date: parsed.payee.due_date,
        currency: parsed.payee.currency || 'USD',
      })
      .select()
      .single();

    if (payeeError) {
      console.error('Payee creation error:', payeeError);
      return NextResponse.json({ error: 'Failed to save payee data' }, { status: 500 });
    }

    // Match against known payees
    const matchResult = await matchKnownPayee(user.id, {
      company_name: payee.company_name,
      payment_rail: payee.payment_rail,
      aba_routing_number: payee.aba_routing_number,
      account_number: payee.account_number,
      transit_number: payee.transit_number,
      institution_number: payee.institution_number,
      swift_code: payee.swift_code,
      iban: payee.iban,
      sort_code: payee.sort_code,
    });

    if (matchResult.type !== 'none') {
      // Store match result on payee
      const updateData: Record<string, unknown> = { match_result: matchResult };

      if (matchResult.type === 'banking_and_name' || matchResult.type === 'banking_only') {
        // Link to known payee and skip verification
        updateData.known_payee_id = matchResult.known_payee_id;

        await supabaseAdmin
          .from('invoices')
          .update({ status: 'pending_review', updated_at: new Date().toISOString() })
          .eq('id', invoiceId);
      }

      await supabaseAdmin
        .from('payees')
        .update(updateData)
        .eq('id', payee.id);
    }

    return NextResponse.json({
      payeeId: payee.id,
      data: parsed,
      matchResult,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
