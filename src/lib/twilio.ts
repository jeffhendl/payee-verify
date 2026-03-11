import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_API_KEY_SID!,
  process.env.TWILIO_API_KEY_SECRET!,
  { accountSid: process.env.TWILIO_ACCOUNT_SID! }
);

interface VerificationSmsParams {
  to: string;
  payeeCompany: string;
  invoiceNumber: string;
  invoiceAmount: number;
  currency: string;
  verifyUrl: string;
}

export async function sendVerificationSms(params: VerificationSmsParams) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency,
  }).format(params.invoiceAmount);

  const message = `Payee Verify: Please verify invoice ${params.invoiceNumber} for ${formattedAmount} from ${params.payeeCompany}. Confirm or flag discrepancies here: ${params.verifyUrl}`;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: params.to,
  });
}
