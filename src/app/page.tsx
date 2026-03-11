import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { DashboardTable } from '@/components/dashboard-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileUp } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch invoices with payee data
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      file_name,
      status,
      created_at,
      payees (
        company_name,
        invoice_amount,
        currency
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">Dashboard</h1>
            <p className="text-[#71717A] mt-1.5 text-[15px]">Manage your invoice verifications</p>
          </div>
          <Link href="/upload">
            <Button className="gap-2 bg-[#045B3F] hover:bg-[#034830] rounded-xl h-10 px-5 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(4,91,63,0.15)]">
              <FileUp className="h-4 w-4" />
              Upload Invoice
            </Button>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <DashboardTable invoices={invoices || []} />
        </div>
      </main>
    </div>
  );
}
