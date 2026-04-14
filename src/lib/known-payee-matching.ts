import { supabaseAdmin } from '@/lib/supabase/admin';
import type { MatchResult } from '@/lib/types';

interface PayeeMatchInput {
  company_name: string | null;
  country: 'US' | 'CA';
  aba_routing_number: string | null;
  account_number: string | null;
  transit_number: string | null;
  institution_number: string | null;
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

async function findBankingMatch(
  userId: string,
  payee: PayeeMatchInput
): Promise<{ knownPayeeId: string; knownPayeeName: string; knownPayeeNickname: string | null } | null> {
  // Get all banking details for this user's known payees
  const { data: bankingDetails } = await supabaseAdmin
    .from('known_payee_banking_details')
    .select('known_payee_id, country, aba_routing_number, account_number, transit_number, institution_number, known_payees!inner(id, user_id, primary_name, nickname)')
    .eq('known_payees.user_id', userId);

  if (!bankingDetails || bankingDetails.length === 0) return null;

  for (const bd of bankingDetails) {
    const matched = payee.country === 'US'
      ? (
          bd.aba_routing_number && payee.aba_routing_number &&
          bd.account_number && payee.account_number &&
          bd.aba_routing_number.trim() === payee.aba_routing_number.trim() &&
          bd.account_number.trim() === payee.account_number.trim()
        )
      : (
          bd.transit_number && payee.transit_number &&
          bd.institution_number && payee.institution_number &&
          bd.account_number && payee.account_number &&
          bd.transit_number.trim() === payee.transit_number.trim() &&
          bd.institution_number.trim() === payee.institution_number.trim() &&
          bd.account_number.trim() === payee.account_number.trim()
        );

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
