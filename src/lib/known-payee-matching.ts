import { supabaseAdmin } from '@/lib/supabase/admin';
import type { MatchResult } from '@/lib/types';

interface PayeeMatchInput {
  company_name: string | null;
  payment_rail: string | null;
  aba_routing_number: string | null;
  account_number: string | null;
  transit_number: string | null;
  institution_number: string | null;
  swift_code: string | null;
  iban: string | null;
  sort_code: string | null;
}

export async function matchKnownPayee(
  userId: string,
  payee: PayeeMatchInput
): Promise<MatchResult> {
  // Step 1: Check for banking detail matches
  const bankingMatch = await findBankingMatch(userId, payee);

  if (bankingMatch) {
    // Banking matched — check if name also matches
    const nameMatched = await checkNameMatch(bankingMatch.knownPayeeId, payee.company_name);
    const displayName = bankingMatch.knownPayeeNickname || bankingMatch.knownPayeeName;

    if (nameMatched) {
      return {
        type: 'banking_and_name',
        known_payee_id: bankingMatch.knownPayeeId,
        known_payee_name: displayName,
        message: `Matches verified payee "${displayName}". Verification has been skipped.`,
      };
    } else {
      return {
        type: 'banking_only',
        known_payee_id: bankingMatch.knownPayeeId,
        known_payee_name: displayName,
        message: `Banking details match verified payee "${displayName}" but company name differs. Review carefully.`,
      };
    }
  }

  // Step 2: No banking match — check for name-only match
  const nameMatch = await findNameMatch(userId, payee.company_name);

  if (nameMatch) {
    const displayName = nameMatch.nickname || nameMatch.primaryName;
    return {
      type: 'name_only',
      known_payee_id: nameMatch.knownPayeeId,
      known_payee_name: displayName,
      message: `Warning: Company name matches "${displayName}" but banking details are different. This could indicate fraud. Please verify via SMS or phone call.`,
    };
  }

  return { type: 'none' };
}

function normalizeForCompare(val: string | null | undefined): string {
  return (val || '').trim().replace(/[\s-]/g, '');
}

async function findBankingMatch(
  userId: string,
  payee: PayeeMatchInput
): Promise<{ knownPayeeId: string; knownPayeeName: string; knownPayeeNickname: string | null } | null> {
  const { data: bankingDetails } = await supabaseAdmin
    .from('known_payee_banking_details')
    .select('known_payee_id, payment_rail, aba_routing_number, account_number, transit_number, institution_number, swift_code, iban, sort_code, known_payees!inner(id, user_id, primary_name, nickname)')
    .eq('known_payees.user_id', userId);

  if (!bankingDetails || bankingDetails.length === 0) return null;

  for (const bd of bankingDetails) {
    let matched = false;

    // Check IBAN match (rail-agnostic — IBAN is globally unique)
    if (payee.iban && bd.iban) {
      matched = normalizeForCompare(payee.iban).toUpperCase() === normalizeForCompare(bd.iban).toUpperCase();
    }

    // Check ACH match
    if (!matched && payee.aba_routing_number && payee.account_number &&
        bd.aba_routing_number && bd.account_number) {
      matched = normalizeForCompare(payee.aba_routing_number) === normalizeForCompare(bd.aba_routing_number) &&
                normalizeForCompare(payee.account_number) === normalizeForCompare(bd.account_number);
    }

    // Check EFT match
    if (!matched && payee.transit_number && payee.institution_number && payee.account_number &&
        bd.transit_number && bd.institution_number && bd.account_number) {
      matched = normalizeForCompare(payee.transit_number) === normalizeForCompare(bd.transit_number) &&
                normalizeForCompare(payee.institution_number) === normalizeForCompare(bd.institution_number) &&
                normalizeForCompare(payee.account_number) === normalizeForCompare(bd.account_number);
    }

    // Check SWIFT match
    if (!matched && payee.swift_code && payee.account_number &&
        bd.swift_code && bd.account_number) {
      matched = normalizeForCompare(payee.swift_code).toUpperCase() === normalizeForCompare(bd.swift_code).toUpperCase() &&
                normalizeForCompare(payee.account_number) === normalizeForCompare(bd.account_number);
    }

    // Check BACS match
    if (!matched && payee.sort_code && payee.account_number &&
        bd.sort_code && bd.account_number) {
      matched = normalizeForCompare(payee.sort_code) === normalizeForCompare(bd.sort_code) &&
                normalizeForCompare(payee.account_number) === normalizeForCompare(bd.account_number);
    }

    if (matched) {
      const kp = bd.known_payees as unknown as { id: string; primary_name: string; nickname: string | null };
      return {
        knownPayeeId: kp.id,
        knownPayeeName: kp.primary_name,
        knownPayeeNickname: kp.nickname,
      };
    }
  }

  return null;
}

async function checkNameMatch(knownPayeeId: string, companyName: string | null): Promise<boolean> {
  if (!companyName) return false;

  const normalized = companyName.toLowerCase().trim();
  const { data } = await supabaseAdmin
    .from('known_payee_aliases')
    .select('id')
    .eq('known_payee_id', knownPayeeId)
    .eq('alias', normalized)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function findNameMatch(
  userId: string,
  companyName: string | null
): Promise<{ knownPayeeId: string; primaryName: string; nickname: string | null } | null> {
  if (!companyName) return null;

  const normalized = companyName.toLowerCase().trim();

  const { data } = await supabaseAdmin
    .from('known_payee_aliases')
    .select('known_payee_id, known_payees!inner(id, user_id, primary_name, nickname)')
    .eq('known_payees.user_id', userId)
    .eq('alias', normalized)
    .limit(1);

  if (!data || data.length === 0) return null;

  const kp = data[0].known_payees as unknown as { id: string; primary_name: string; nickname: string | null };
  return {
    knownPayeeId: kp.id,
    primaryName: kp.primary_name,
    nickname: kp.nickname,
  };
}
