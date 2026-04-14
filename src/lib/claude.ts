import Anthropic from '@anthropic-ai/sdk';
import type { ParsedInvoiceData } from './types';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.INVOICE_PARSER_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

export async function parseInvoice(pdfBase64: string): Promise<ParsedInvoiceData> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: `Extract all payee and invoice details from this invoice PDF. Return a JSON object with this exact structure:

{
  "payee": {
    "company_name": "string or null",
    "contact_name": "string or null",
    "contact_email": "string or null",
    "contact_phone": "string or null (E.164 format if possible)",
    "address_line1": "string or null",
    "address_line2": "string or null",
    "city": "string or null",
    "state_province": "string or null",
    "postal_code": "string or null",
    "country": "string or null (e.g. 'US', 'CA', 'GB', 'DE', 'FR', etc.)",
    "payment_rail": "ach" or "eft" or "swift" or "sepa" or "bacs" or null,
    "aba_routing_number": "string or null (US ACH, 9 digits)",
    "account_number": "string or null",
    "transit_number": "string or null (Canadian EFT, 5 digits)",
    "institution_number": "string or null (Canadian EFT, 3 digits)",
    "swift_code": "string or null (SWIFT/BIC, 8 or 11 characters)",
    "iban": "string or null (IBAN, 15-34 alphanumeric)",
    "sort_code": "string or null (UK BACS, 6 digits)",
    "bank_name": "string or null",
    "account_type": "checking" or "savings" or null,
    "invoice_number": "string or null",
    "invoice_amount": number or null,
    "invoice_date": "YYYY-MM-DD" or null,
    "due_date": "YYYY-MM-DD" or null,
    "currency": "USD" or "CAD" or "EUR" or "GBP",
    "intermediary_bank_detected": true or false
  },
  "confidence": 0.0 to 1.0,
  "raw_text_excerpt": "first 200 chars of extracted text"
}

Rules:
- The payee is the entity RECEIVING payment (the vendor/supplier), not the entity paying.
- Determine country from the payee's address. Use ISO 2-letter codes (US, CA, GB, DE, FR, etc.).
- Detect the payment rail from banking details:
  - ABA routing number (9 digits) → payment_rail: "ach"
  - Canadian transit number (5 digits) + institution number (3 digits) → payment_rail: "eft"
  - SWIFT/BIC code (8 or 11 alphanumeric characters) → payment_rail: "swift"
  - IBAN (starts with 2-letter country code + 2 check digits, 15-34 chars total) → payment_rail: "sepa"
  - UK sort code (6 digits, often formatted as XX-XX-XX) → payment_rail: "bacs"
- A USD invoice can use any payment rail (e.g. Asian suppliers billing in USD use SWIFT, not ACH).
- If an intermediary bank, correspondent bank, or beneficiary bank routing through another bank is mentioned, set intermediary_bank_detected to true. Extract only the beneficiary (final) bank details, not the intermediary.
- Set confidence based on how clearly the data was found (1.0 = all fields clearly present, 0.5 = some guessing required, below 0.5 = significant uncertainty).
- Return ONLY valid JSON, no markdown fences or additional text.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try to parse, handling potential markdown fences
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(cleanText) as ParsedInvoiceData;
}
