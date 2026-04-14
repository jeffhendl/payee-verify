import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_API_KEY_SID!,
  process.env.TWILIO_API_KEY_SECRET!,
  { accountSid: process.env.TWILIO_ACCOUNT_SID! }
);

interface VerificationSmsParams {
  to: string;
  senderFirstName: string;
  senderCompany: string;
  payeeCompany: string;
  invoiceAmount: number;
  currency: string;
  verifyUrl: string;
}

export async function sendVerificationSms(params: VerificationSmsParams) {
  const formattedAmount = (params.currency === 'USD' ? 'US' : 'CA') + new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency,
    currencyDisplay: 'narrowSymbol',
  }).format(params.invoiceAmount);

  const message = `${params.senderFirstName} at ${params.senderCompany} is requesting that you verify an invoice for ${params.payeeCompany} for ${formattedAmount}. Please review and confirm here: ${params.verifyUrl}`;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: params.to,
  });
}
