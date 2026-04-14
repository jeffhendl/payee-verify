import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NavBar } from '@/components/nav-bar';
import { KnownPayeeDetail } from '@/components/known-payee-detail';
import type { KnownPayee, KnownPayeeAlias, KnownPayeeBankingDetails } from '@/lib/types';

interface LinkedInvoice {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  company_name: string | null;
}

export default async function KnownPayeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: knownPayee } = await supabaseAdmin
    .from('known_payees')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!knownPayee) redirect('/payees');

  const { data: aliases } = await supabaseAdmin
    .from('known_payee_aliases')
    .select('*')
    .eq('known_payee_id', id)
    .order('alias');

  const { data: bankingDetails } = await supabaseAdmin
    .from('known_payee_banking_details')
    .select('*')
    .eq('known_payee_id', id)
    .order('created_at');

  const { data: linkedPayees } = await supabaseAdmin
    .from('payees')
    .select('invoice_id, company_name, invoices!inner(id, file_name, status, created_at)')
    .eq('known_payee_id', id);

  const linkedInvoices: LinkedInvoice[] = (linkedPayees || []).map(p => {
    const inv = p.invoices as unknown as { id: string; file_name: string; status: string; created_at: string };
    return {
      id: inv.id,
      file_name: inv.file_name,
      status: inv.status,
      created_at: inv.created_at,
      company_name: p.company_name,
    };
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <KnownPayeeDetail
          knownPayee={knownPayee as KnownPayee}
          aliases={aliases as KnownPayeeAlias[] || []}
          bankingDetails={bankingDetails as KnownPayeeBankingDetails[] || []}
          linkedInvoices={linkedInvoices}
        />
      </main>
    </div>
  );
}
