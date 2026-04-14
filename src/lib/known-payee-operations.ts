import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasBankingDetails } from '@/lib/utils';
import type { Payee } from '@/lib/types';

export async function upsertKnownPayeeOnApproval(userId: string, payee: Payee): Promise<void> {
  const normalizedName = payee.company_name?.toLowerCase().trim() || '';

  if (payee.known_payee_id) {
    // Already linked — add alias and banking if not present
    await addAliasIfNew(payee.known_payee_id, normalizedName);
    await addBankingIfNew(payee.known_payee_id, payee);
    return;
  }

  // Not linked — check if a known payee already exists for this name (race condition guard)
  const { data: existingAlias } = await supabaseAdmin
    .from('known_payee_aliases')
    .select('known_payee_id, known_payees!inner(id, user_id)')
    .eq('known_payees.user_id', userId)
    .eq('alias', normalizedName)
    .limit(1);

  if (existingAlias && existingAlias.length > 0) {
    const knownPayeeId = existingAlias[0].known_payee_id;
    await addBankingIfNew(knownPayeeId, payee);
    await supabaseAdmin
      .from('payees')
      .update({ known_payee_id: knownPayeeId })
      .eq('id', payee.id);
    return;
  }

  // Create new known payee
  const { data: newKnownPayee, error } = await supabaseAdmin
    .from('known_payees')
    .insert({
      user_id: userId,
      primary_name: payee.company_name || 'Unknown Payee',
      nickname: payee.company_name || null,
    })
    .select()
    .single();

  if (error || !newKnownPayee) {
    console.error('Failed to create known payee:', error);
    return;
  }

  // Add alias
  if (normalizedName) {
    await supabaseAdmin
      .from('known_payee_aliases')
      .upsert(
        { known_payee_id: newKnownPayee.id, alias: normalizedName },
        { onConflict: 'known_payee_id,alias', ignoreDuplicates: true }
      );
  }

  // Add banking details
  await insertBankingDetails(newKnownPayee.id, payee);

  // Link the invoice payee to the known payee
  await supabaseAdmin
    .from('payees')
    .update({ known_payee_id: newKnownPayee.id })
    .eq('id', payee.id);
}

async function addAliasIfNew(knownPayeeId: string, alias: string): Promise<void> {
  if (!alias) return;
  await supabaseAdmin
    .from('known_payee_aliases')
    .upsert(
      { known_payee_id: knownPayeeId, alias },
      { onConflict: 'known_payee_id,alias', ignoreDuplicates: true }
    );
}

function normalize(val: string | null | undefined): string {
  return (val || '').trim().replace(/[\s-]/g, '');
}

async function addBankingIfNew(knownPayeeId: string, payee: Payee): Promise<void> {
  if (!hasBankingDetails(payee)) return;

  // Fetch existing banking for this known payee
  const { data: existing } = await supabaseAdmin
    .from('known_payee_banking_details')
    .select('*')
    .eq('known_payee_id', knownPayeeId);

  if (existing && existing.length > 0) {
    for (const e of existing) {
      // Check for duplicate based on the primary identifier for each rail
      if (payee.iban && e.iban && normalize(payee.iban).toUpperCase() === normalize(e.iban).toUpperCase()) return;
      if (payee.aba_routing_number && e.aba_routing_number &&
          normalize(payee.aba_routing_number) === normalize(e.aba_routing_number) &&
          normalize(payee.account_number) === normalize(e.account_number)) return;
      if (payee.transit_number && e.transit_number &&
          normalize(payee.transit_number) === normalize(e.transit_number) &&
          normalize(payee.institution_number) === normalize(e.institution_number) &&
          normalize(payee.account_number) === normalize(e.account_number)) return;
      if (payee.swift_code && e.swift_code &&
          normalize(payee.swift_code).toUpperCase() === normalize(e.swift_code).toUpperCase() &&
          normalize(payee.account_number) === normalize(e.account_number)) return;
      if (payee.sort_code && e.sort_code &&
          normalize(payee.sort_code) === normalize(e.sort_code) &&
          normalize(payee.account_number) === normalize(e.account_number)) return;
    }
  }

  await insertBankingDetails(knownPayeeId, payee);
}

async function insertBankingDetails(knownPayeeId: string, payee: Payee): Promise<void> {
  if (!hasBankingDetails(payee)) return;

  await supabaseAdmin
    .from('known_payee_banking_details')
    .insert({
      known_payee_id: knownPayeeId,
      country: payee.country,
      payment_rail: payee.payment_rail,
      aba_routing_number: payee.aba_routing_number,
      account_number: payee.account_number,
      transit_number: payee.transit_number,
      institution_number: payee.institution_number,
      swift_code: payee.swift_code,
      iban: payee.iban,
      sort_code: payee.sort_code,
      bank_name: payee.bank_name,
      account_type: payee.account_type,
      currency: payee.currency,
    });
}
