import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { MatchResult } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payeeId, knownPayeeId } = await request.json();

    if (!payeeId || !knownPayeeId) {
      return NextResponse.json({ error: 'payeeId and knownPayeeId are required' }, { status: 400 });
    }

    // Verify the payee belongs to an invoice owned by this user
    const { data: payee } = await supabaseAdmin
      .from('payees')
      .select('*, invoices!inner(user_id)')
      .eq('id', payeeId)
      .single();

    if (!payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    const invoiceUserId = (payee.invoices as unknown as { user_id: string }).user_id;
    if (invoiceUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the known payee belongs to this user
    const { data: knownPayee } = await supabaseAdmin
      .from('known_payees')
      .select('id, primary_name, nickname')
      .eq('id', knownPayeeId)
      .eq('user_id', user.id)
      .single();

    if (!knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    // Add company name as alias
    if (payee.company_name) {
      const normalizedName = payee.company_name.toLowerCase().trim();
      await supabaseAdmin
        .from('known_payee_aliases')
        .upsert(
          { known_payee_id: knownPayeeId, alias: normalizedName },
          { onConflict: 'known_payee_id,alias', ignoreDuplicates: true }
        );
    }

    // Check if banking details match any of the known payee's banking details
    const { data: knownBanking } = await supabaseAdmin
      .from('known_payee_banking_details')
      .select('*')
      .eq('known_payee_id', knownPayeeId);

    let hasBankingMatch = false;
    if (knownBanking && payee.account_number) {
      for (const bd of knownBanking) {
        if (payee.country === 'US') {
          if (bd.aba_routing_number?.trim() === payee.aba_routing_number?.trim() &&
              bd.account_number?.trim() === payee.account_number?.trim()) {
            hasBankingMatch = true;
            break;
          }
        } else {
          if (bd.transit_number?.trim() === payee.transit_number?.trim() &&
              bd.institution_number?.trim() === payee.institution_number?.trim() &&
              bd.account_number?.trim() === payee.account_number?.trim()) {
            hasBankingMatch = true;
            break;
          }
        }
      }
    }

    const displayName = knownPayee.nickname || knownPayee.primary_name;

    const matchResult: MatchResult = hasBankingMatch
      ? {
          type: 'banking_and_name',
          known_payee_id: knownPayeeId,
          known_payee_name: displayName,
          message: `Matches verified payee "${displayName}". Verification has been skipped.`,
        }
      : {
          type: 'banking_only',
          known_payee_id: knownPayeeId,
          known_payee_name: displayName,
          message: `Linked to "${displayName}" but banking details don't match any on file. Review carefully.`,
        };

    // Update payee with link and match result
    await supabaseAdmin
      .from('payees')
      .update({ known_payee_id: knownPayeeId, match_result: matchResult })
      .eq('id', payeeId);

    // If banking matched, set invoice to pending_review
    if (hasBankingMatch) {
      await supabaseAdmin
        .from('invoices')
        .update({ status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', payee.invoice_id);
    }

    return NextResponse.json({ success: true, matchResult });
  } catch (error) {
    console.error('Link known payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
