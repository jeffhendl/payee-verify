export type InvoiceStatus = 'uploaded' | 'parsing' | 'parsed' | 'verification_sent' | 'pending_review' | 'verified' | 'denied' | 'failed';
export type VerificationStatus = 'pending' | 'sent' | 'opened' | 'confirmed' | 'denied' | 'expired' | 'failed';
export type Country = 'US' | 'CA';

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
  country: Country;
  aba_routing_number: string | null;
  account_number: string | null;
  transit_number: string | null;
  institution_number: string | null;
  bank_name: string | null;
  account_type: 'checking' | 'savings' | null;
  invoice_number: string | null;
  invoice_amount: number | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: 'USD' | 'CAD';
  created_at: string;
  updated_at: string;
}

export interface Verification {
  id: string;
  payee_id: string;
  invoice_id: string;
  type: 'email' | 'phone';
  status: VerificationStatus;
  token: string;
  sent_at: string | null;
  responded_at: string | null;
  response_data: VerificationResponse | null;
  expires_at: string;
  created_at: string;
}

export interface ParsedInvoiceData {
  payee: Omit<Payee, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>;
  confidence: number;
  raw_text_excerpt: string;
}

export interface VerificationResponse {
  confirmed: boolean;
  discrepancies: string | null;
  respondent_name: string;
  respondent_role: string;
  timestamp: string;
}
