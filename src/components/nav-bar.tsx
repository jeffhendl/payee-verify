'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FileUp, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';

export function NavBar() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-[#045B3F] border-b border-[#034830]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#D2F3A7]" />
            <div>
              <span className="font-bold text-lg text-white leading-none">Payee Verify</span>
              <span className="text-[#D2F3A7] text-xs block leading-none mt-0.5">by Loop</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-white/80 hover:text-white hover:bg-white/10">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="ghost" size="sm" className="gap-2 text-white/80 hover:text-white hover:bg-white/10">
                <FileUp className="h-4 w-4" />
                Upload Invoice
              </Button>
            </Link>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-white/80 hover:text-white hover:bg-white/10">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
