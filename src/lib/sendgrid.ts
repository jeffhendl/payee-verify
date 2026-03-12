import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface VerificationEmailParams {
  to: string;
  payeeCompany: string;
  invoiceNumber: string;
  invoiceAmount: number;
  currency: string;
  verifyUrl: string;
}

export async function sendVerificationEmail(params: VerificationEmailParams) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency,
  }).format(params.invoiceAmount);

  const msg = {
    to: params.to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: 'VeriPay',
    },
    subject: `Invoice Verification Request - ${params.invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#18181b;font-size:24px;margin:0;">Invoice Verification Request</h1>
      </div>

      <p style="color:#3f3f46;font-size:16px;line-height:1.6;">
        Hello,
      </p>
      <p style="color:#3f3f46;font-size:16px;line-height:1.6;">
        One of our clients is processing a payment and has requested verification of the following invoice details:
      </p>

      <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:14px;">Invoice Number</td>
            <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:600;text-align:right;">${params.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:14px;">Amount</td>
            <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:600;text-align:right;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:14px;">Payee</td>
            <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:600;text-align:right;">${params.payeeCompany}</td>
          </tr>
        </table>
      </div>

      <p style="color:#3f3f46;font-size:16px;line-height:1.6;">
        Please click the button below to confirm these details are correct or report any discrepancies.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${params.verifyUrl}" style="display:inline-block;background:#18181b;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
          Verify Invoice Details
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0;">

      <p style="color:#a1a1aa;font-size:12px;line-height:1.6;text-align:center;">
        This verification link expires in 72 hours. If you did not expect this request, please disregard this email.
        <br><br>
        Sent by VeriPay
      </p>
    </div>
  </div>
</body>
</html>`,
  };

  await sgMail.send(msg);
}
