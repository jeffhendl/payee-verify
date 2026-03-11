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
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your invoice verifications</p>
          </div>
          <Link href="/upload">
            <Button className="gap-2">
              <FileUp className="h-4 w-4" />
              Upload Invoice
            </Button>
          </Link>
        </div>
        <div className="bg-white rounded-lg border">
          <DashboardTable invoices={invoices || []} />
        </div>
      </main>
    </div>
  );
}
