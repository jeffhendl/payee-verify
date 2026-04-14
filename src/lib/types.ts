export type InvoiceStatus = 'uploaded' | 'parsing' | 'parsed' | 'verification_sent' | 'pending_review' | 'verified' | 'denied' | 'failed';
export type VerificationStatus = 'pending' | 'sent' | 'opened' | 'confirmed' | 'denied' | 'expired' | 'failed';
export type Country = 'US' | 'CA'; // kept for backward compat
export type PaymentRail = 'ach' | 'eft' | 'swift' | 'sepa' | 'bacs';
export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP';

export const PAYMENT_RAIL_CONFIG: Record<PaymentRail, { label: string; requiredFields: string[] }> = {
  ach: { label: 'ACH (US Domestic)', requiredFields: ['aba_routing_number', 'account_number'] },
  eft: { label: 'Canadian EFT', requiredFields: ['transit_number', 'institution_number', 'account_number'] },
  swift: { label: 'SWIFT Wire', requiredFields: ['swift_code', 'account_number'] },
  sepa: { label: 'SEPA / IBAN', requiredFields: ['iban'] },
  bacs: { label: 'UK BACS', requiredFields: ['sort_code', 'account_number'] },
};

export const CURRENCY_CONFIG: Record<Currency, { prefix: string; narrowSymbol: boolean }> = {
  USD: { prefix: 'US', narrowSymbol: true },
  CAD: { prefix: 'CA', narrowSymbol: true },
  EUR: { prefix: '', narrowSymbol: true },
  GBP: { prefix: '', narrowSymbol: true },
};

export interface Invoice {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_url: string | null;
  status: InvoiceStatus;
  raw_extracted: ParsedInvoiceData | null;
  created_at: string;
  updated_at: string;
}

export interface Payee {
  id: string;
  invoice_id: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string;
  payment_rail: PaymentRail | null;
  aba_routing_number: string | null;
  account_number: string | null;
  transit_number: string | null;
  institution_number: string | null;
  swift_code: string | null;
  iban: string | null;
  sort_code: string | null;
  bank_name: string | null;
  account_type: 'checking' | 'savings' | null;
  invoice_number: string | null;
  invoice_amount: number | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: Currency;
  intermediary_bank_detected: boolean;
  known_payee_id: string | null;
  match_result: MatchResult | null;
  created_at: string;
  updated_at: string;
}

export type MatchResultType = 'banking_and_name' | 'banking_only' | 'name_only' | 'none';

export interface MatchResult {
  type: MatchResultType;
  known_payee_id?: string;
  known_payee_name?: string;
  message?: string;
}

export interface KnownPayee {
  id: string;
  user_id: string;
  primary_name: string;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnownPayeeAlias {
  id: string;
  known_payee_id: string;
  alias: string;
  created_at: string;
}

export interface KnownPayeeBankingDetails {
  id: string;
  known_payee_id: string;
  country: string;
  payment_rail: PaymentRail | null;
  aba_routing_number: string | null;
  account_number: string | null;
  transit_number: string | null;
  institution_number: string | null;
  swift_code: string | null;
  iban: string | null;
  sort_code: string | null;
  bank_name: string | null;
  account_type: 'checking' | 'savings' | null;
  currency: Currency;
  created_at: string;
}

export interface Verification {
  id: string;
  payee_id: string;
  invoice_id: string;
  type: 'email' | 'phone' | 'sms' | 'phone_call';
  status: VerificationStatus;
  token: string;
  sent_at: string | null;
  responded_at: string | null;
  response_data: VerificationResponse | Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
}

export interface ParsedInvoiceData {
  payee: Omit<Payee, 'id' | 'invoice_id' | 'created_at' | 'updated_at' | 'known_payee_id' | 'match_result'>;
  confidence: number;
  raw_text_excerpt: string;
}

export interface VerificationResponse {
  confirmed: boolean;
  discrepancies: string | null;
  respondent_name: string;
  respondent_role: string;
  timestamp: string;
  banking_details_provided?: boolean;
  call_id?: string;
  call_type?: string;
  call_status?: string;
  transcript?: string | null;
  call_analysis?: Record<string, unknown> | null;
}
