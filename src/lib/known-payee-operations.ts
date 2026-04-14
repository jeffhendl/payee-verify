import { supabaseAdmin } from '@/lib/supabase/admin';
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
  await addBankingDetails(newKnownPayee.id, payee);

  // Link the invoice payee to the known payee
  await supabaseAdmin
    .from('payees')
    .update({ known_payee_id: newKnownPayee.id })
    .eq('id', payee.id);
}

async function addAliasIfNew(knownPayeeId: string, alias: string): Promise<void> {
  if (!alias) return;

  // upsert-style: insert and ignore conflict
  await supabaseAdmin
    .from('known_payee_aliases')
    .upsert(
      { known_payee_id: knownPayeeId, alias },
      { onConflict: 'known_payee_id,alias', ignoreDuplicates: true }
    );
}

async function addBankingIfNew(knownPayeeId: string, payee: Payee): Promise<void> {
  const hasBanking = payee.country === 'US'
    ? (payee.aba_routing_number && payee.account_number)
    : (payee.transit_number && payee.institution_number && payee.account_number);

  if (!hasBanking) return;

  // Check if identical banking details already exist
  const { data: existing } = await supabaseAdmin
    .from('known_payee_banking_details')
    .select('id')
    .eq('known_payee_id', knownPayeeId)
    .eq('account_number', payee.account_number!.trim());

  if (existing && existing.length > 0) {
    // Check more specifically
    for (const e of existing) {
      // If account number matches, check routing/transit
      const { data: detail } = await supabaseAdmin
        .from('known_payee_banking_details')
        .select('*')
        .eq('id', e.id)
        .single();

      if (!detail) continue;

      if (payee.country === 'US') {
        if (detail.aba_routing_number?.trim() === payee.aba_routing_number?.trim()) {
          return; // Already exists
        }
      } else {
        if (
          detail.transit_number?.trim() === payee.transit_number?.trim() &&
          detail.institution_number?.trim() === payee.institution_number?.trim()
        ) {
          return; // Already exists
        }
      }
    }
  }

  await addBankingDetails(knownPayeeId, payee);
}

async function addBankingDetails(knownPayeeId: string, payee: Payee): Promise<void> {
  const hasBanking = payee.country === 'US'
    ? (payee.aba_routing_number && payee.account_number)
    : (payee.transit_number && payee.institution_number && payee.account_number);

  if (!hasBanking) return;

  await supabaseAdmin
    .from('known_payee_banking_details')
    .insert({
      known_payee_id: knownPayeeId,
      country: payee.country,
      aba_routing_number: payee.aba_routing_number,
      account_number: payee.account_number,
      transit_number: payee.transit_number,
      institution_number: payee.institution_number,
      bank_name: payee.bank_name,
      account_type: payee.account_type,
      currency: payee.currency,
    });
}
