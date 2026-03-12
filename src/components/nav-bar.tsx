'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FileUp, LayoutDashboard, LogOut, ShieldCheck, BookOpen } from 'lucide-react';

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E8EAEC]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#045B3F] flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-[15px] text-[#1D1D1D] leading-none tracking-[-0.01em]">Payee Verify</span>
              <span className="text-[#71717A] text-[11px] block leading-none mt-0.5">by Loop</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 rounded-lg text-[13px] font-medium ${
                  isActive('/')
                    ? 'bg-[#F2FCE4] text-[#045B3F]'
                    : 'text-[#71717A] hover:text-[#1D1D1D] hover:bg-[#F7F7F7]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/upload">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 rounded-lg text-[13px] font-medium ${
                  isActive('/upload')
                    ? 'bg-[#F2FCE4] text-[#045B3F]'
                    : 'text-[#71717A] hover:text-[#1D1D1D] hover:bg-[#F7F7F7]'
                }`}
              >
                <FileUp className="h-4 w-4" />
                Upload
              </Button>
            </Link>
            <Link href="/blog">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 rounded-lg text-[13px] font-medium ${
                  isActive('/blog')
                    ? 'bg-[#F2FCE4] text-[#045B3F]'
                    : 'text-[#71717A] hover:text-[#1D1D1D] hover:bg-[#F7F7F7]'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Blog
              </Button>
            </Link>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 rounded-lg text-[13px] font-medium text-[#71717A] hover:text-[#1D1D1D] hover:bg-[#F7F7F7]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
