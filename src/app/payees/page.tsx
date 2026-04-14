import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

export default async function PayeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: knownPayees } = await supabaseAdmin
    .from('known_payees')
    .select('id, primary_name, nickname, created_at')
    .eq('user_id', user.id)
    .order('primary_name');

  // Get invoice counts
  const payeeIds = (knownPayees || []).map(kp => kp.id);
  const { data: linkCounts } = payeeIds.length > 0
    ? await supabaseAdmin
        .from('payees')
        .select('known_payee_id')
        .in('known_payee_id', payeeIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  (linkCounts || []).forEach(p => {
    if (p.known_payee_id) {
      countMap[p.known_payee_id] = (countMap[p.known_payee_id] || 0) + 1;
    }
  });

  // Get banking detail counts
  const { data: bankingCounts } = payeeIds.length > 0
    ? await supabaseAdmin
        .from('known_payee_banking_details')
        .select('known_payee_id')
        .in('known_payee_id', payeeIds)
    : { data: [] };

  const bankingCountMap: Record<string, number> = {};
  (bankingCounts || []).forEach(b => {
    if (b.known_payee_id) {
      bankingCountMap[b.known_payee_id] = (bankingCountMap[b.known_payee_id] || 0) + 1;
    }
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">Known Payees</h1>
          <p className="text-[#71717A] mt-1.5 text-[15px]">
            Payees that have been verified through previous invoices. New invoices matching these payees skip SMS/phone verification.
          </p>
        </div>

        {(!knownPayees || knownPayees.length === 0) ? (
          <Card className="rounded-2xl border-[#E8EAEC]">
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-[#92979C] mx-auto mb-4" />
              <p className="text-base font-medium text-[#383B3E] mb-1">No known payees yet</p>
              <p className="text-sm text-[#92979C]">
                When you verify and approve an invoice, the payee is automatically saved here for future matching.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {knownPayees.map(kp => (
              <Link key={kp.id} href={`/payees/${kp.id}`}>
                <Card className="rounded-2xl border-[#E8EAEC] hover:border-[#045B3F] hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[#F2FCE4] flex items-center justify-center">
                          <Users className="h-5 w-5 text-[#045B3F]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1D1D1D]">
                            {kp.nickname || kp.primary_name}
                          </p>
                          {kp.nickname && (
                            <p className="text-sm text-[#71717A]">{kp.primary_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {countMap[kp.id] || 0} invoice{(countMap[kp.id] || 0) !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {bankingCountMap[kp.id] || 0} bank account{(bankingCountMap[kp.id] || 0) !== 1 ? 's' : ''}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-[#92979C]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
