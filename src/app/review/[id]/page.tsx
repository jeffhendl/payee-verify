import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { ExtractedDataForm } from '@/components/extracted-data-form';
import { PdfPreview } from '@/components/pdf-preview';
import type { Invoice, Payee, Verification } from '@/lib/types';

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (invoiceError || !invoice) {
    redirect('/');
  }

  // Fetch payee
  const { data: payee } = await supabase
    .from('payees')
    .select('*')
    .eq('invoice_id', id)
    .single();

  if (!payee) {
    redirect('/');
  }

  // Fetch latest verification
  const { data: verifications } = await supabase
    .from('verifications')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  const verification = verifications?.[0] || null;

  // If verification is confirmed but invoice status is stale, fix it
  if (verification?.status === 'confirmed' && (invoice as Invoice).status === 'verification_sent') {
    await supabase
      .from('invoices')
      .update({ status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('id', id);
    (invoice as Record<string, unknown>).status = 'pending_review';
  }

  // Dynamic title based on status (also check verification status as fallback)
  const isPendingReview = (invoice as Invoice).status === 'pending_review' || verification?.status === 'confirmed';
  const isVerified = (invoice as Invoice).status === 'verified';
  const isDenied = (invoice as Invoice).status === 'denied';

  let title = 'Review Extracted Data';
  let subtitle = `Review and edit the details extracted from`;
  if (isPendingReview) {
    title = 'Review Payee Response';
    subtitle = `The payee has confirmed the details. Review and approve for`;
  } else if (isVerified) {
    title = 'Verified Invoice';
    subtitle = `This invoice has been verified and approved for`;
  } else if (isDenied) {
    title = 'Rejected Invoice';
    subtitle = `This invoice was rejected for`;
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">{title}</h1>
          <p className="text-[#71717A] mt-1.5 text-[15px]">
            {subtitle} <strong>{(invoice as Invoice).file_name}</strong>
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div>
            <ExtractedDataForm
              invoice={invoice as Invoice}
              payee={payee as Payee}
              verification={verification as Verification | null}
            />
          </div>
          <div className="hidden lg:block">
            <PdfPreview invoiceId={id} />
          </div>
        </div>
      </main>
    </div>
  );
}
