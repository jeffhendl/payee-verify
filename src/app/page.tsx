import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { DashboardTable } from '@/components/dashboard-table';
import { FailedUploadsLog } from '@/components/failed-uploads-log';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { FileUp, ShieldCheck, Zap, Globe, AlertTriangle } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const firstName = user.user_metadata?.first_name || 'there';

  // Fetch invoices with payee and verification data
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
      ),
      verifications (
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fix stale statuses: if verification is confirmed/opened/denied but invoice still shows verification_sent
  const allInvoices = (invoices || []).map(inv => {
    const verStatus = (inv.verifications as { status: string }[])?.[0]?.status;
    if (inv.status === 'verification_sent' && (verStatus === 'confirmed' || verStatus === 'opened')) {
      // Fix it in the DB in the background
      supabase.from('invoices').update({ status: 'pending_review', updated_at: new Date().toISOString() }).eq('id', inv.id).then(() => {});
      return { ...inv, status: 'pending_review' };
    }
    if (inv.status === 'verification_sent' && verStatus === 'denied') {
      supabase.from('invoices').update({ status: 'denied', updated_at: new Date().toISOString() }).eq('id', inv.id).then(() => {});
      return { ...inv, status: 'denied' };
    }
    return inv;
  });
  const activeInvoices = allInvoices.filter(i => i.status !== 'failed');
  const failedInvoices = allInvoices.filter(i => i.status === 'failed');

  return (
    <div className="min-h-screen bg-[#FCFCFC]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">Welcome back, {firstName}</h1>
            <p className="text-[#71717A] mt-1.5 text-[15px]">Manage your invoice verifications</p>
          </div>
          <Link href="/upload">
            <Button className="gap-2 bg-[#045B3F] hover:bg-[#034830] h-10 px-5 text-[13px] font-medium">
              <FileUp className="h-4 w-4" />
              Upload Invoice
            </Button>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <DashboardTable invoices={activeInvoices} />
        </div>

        {failedInvoices.length > 0 && (
          <FailedUploadsLog invoices={failedInvoices} />
        )}

        {/* How it works section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-full bg-[#F2FCE4] flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 text-[#045B3F]" />
              </div>
              <h3 className="font-semibold text-[#1D1D1D] mb-1.5">Verify Before You Pay</h3>
              <p className="text-sm text-[#71717A] leading-relaxed">
                Upload an invoice and our AI extracts vendor details automatically. Send verification to the payee before releasing payment.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-full bg-[#F2FCE4] flex items-center justify-center mb-4">
                <AlertTriangle className="h-5 w-5 text-[#045B3F]" />
              </div>
              <h3 className="font-semibold text-[#1D1D1D] mb-1.5">Catch Fraud Early</h3>
              <p className="text-sm text-[#71717A] leading-relaxed">
                Validate banking formats, detect name mismatches, and flag inconsistencies before funds are sent to the wrong account.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-full bg-[#F2FCE4] flex items-center justify-center mb-4">
                <Globe className="h-5 w-5 text-[#045B3F]" />
              </div>
              <h3 className="font-semibold text-[#1D1D1D] mb-1.5">US &amp; Canadian Support</h3>
              <p className="text-sm text-[#71717A] leading-relaxed">
                Supports ABA routing numbers for US accounts and transit/institution numbers for Canadian accounts out of the box.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#E8EAEC] flex items-center justify-between text-xs text-[#92979C]">
          <p>Verification results are based on automated checks. Always confirm payment details independently before transferring funds.</p>
          <div className="flex items-center gap-4 whitespace-nowrap ml-4">
            <a href="https://www.bankonloop.com/en-ca/legal#privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Privacy Policy
            </a>
            <a href="https://bankonloop.com" target="_blank" rel="noopener noreferrer" className="font-medium text-[#045B3F] hover:underline">
              Powered by Loop
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
