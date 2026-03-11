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
    "contact_phone": "string or null",
    "address_line1": "string or null",
    "address_line2": "string or null",
    "city": "string or null",
    "state_province": "string or null",
    "postal_code": "string or null",
    "country": "US" or "CA",
    "aba_routing_number": "string or null (US only, 9 digits)",
    "account_number": "string or null",
    "transit_number": "string or null (CA only, 5 digits)",
    "institution_number": "string or null (CA only, 3 digits)",
    "bank_name": "string or null",
    "account_type": "checking" or "savings" or null,
    "invoice_number": "string or null",
    "invoice_amount": number or null,
    "invoice_date": "YYYY-MM-DD" or null,
    "due_date": "YYYY-MM-DD" or null,
    "currency": "USD" or "CAD"
  },
  "confidence": 0.0 to 1.0,
  "raw_text_excerpt": "first 200 chars of extracted text"
}

Rules:
- The payee is the entity RECEIVING payment (the vendor/supplier), not the entity paying.
- Determine country from address, currency, or banking details. If Canadian transit/institution numbers are present or address is in Canada, set country to "CA" and currency to "CAD".
- For US payees, look for ABA routing number (9 digits) and account number.
- For Canadian payees, look for transit number (5 digits) and institution number (3 digits).
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
