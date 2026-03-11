import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { ExtractedDataForm } from '@/components/extracted-data-form';
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

  return (
    <div className="min-h-screen bg-[#FCFCFC]">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#383B3E]">Review Extracted Data</h1>
          <p className="text-[#92979C] mt-1">
            Review and edit the details extracted from <strong>{(invoice as Invoice).file_name}</strong>
          </p>
        </div>
        <ExtractedDataForm
          invoice={invoice as Invoice}
          payee={payee as Payee}
          verification={verification as Verification | null}
        />
      </main>
    </div>
  );
}
