import { supabaseAdmin } from '@/lib/supabase/admin';
import { VerificationResponseForm } from '@/components/verification-response';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, Clock, CheckCircle } from 'lucide-react';

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Look up verification by token using admin client (public page, no auth)
  const { data: verification, error } = await supabaseAdmin
    .from('verifications')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !verification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-500">This verification link is not valid. Please check the link and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  if (new Date(verification.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
            <p className="text-gray-500">This verification link has expired. Please contact the sender for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already responded
  if (verification.status === 'confirmed' || verification.status === 'denied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Already Responded</h2>
            <p className="text-gray-500">You have already submitted your verification response. Thank you!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the payee details
  const { data: payee } = await supabaseAdmin
    .from('payees')
    .select('company_name, invoice_number, invoice_amount, currency, bank_name, aba_routing_number, account_number, transit_number, institution_number, country')
    .eq('id', verification.payee_id)
    .single();

  if (!payee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-500">Unable to load invoice details. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Verification</h1>
        <p className="text-gray-500 mt-1">
          Please review the following invoice details and confirm they are correct
        </p>
      </div>
      <VerificationResponseForm token={token} payee={payee} />
    </div>
  );
}
