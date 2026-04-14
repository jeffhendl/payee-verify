'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuPopup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileUp, LayoutDashboard, LogOut, BookOpen, User, Settings, ChevronDown } from 'lucide-react';

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

  const navItemClass = (path: string) =>
    `gap-2 rounded-lg text-[13px] font-medium h-8 px-3 ${
      isActive(path)
        ? 'bg-[#F2FCE4] text-[#045B3F]'
        : 'text-[#606265] hover:text-[#383B3E] hover:bg-[#F2F2F2]'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#E8EAEC]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/veripay-logo.png" alt="VeriPay" width={32} height={32} className="rounded-lg" />
            <div>
              <span className="font-semibold text-[15px] text-[#1D1D1D] leading-none tracking-[-0.01em]">VeriPay</span>
              <span className="text-[#92979C] text-[11px] block leading-none mt-0.5">by Loop</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" className={navItemClass('/')}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="ghost" className={navItemClass('/upload')}>
                <FileUp className="h-4 w-4" />
                Upload
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" className={navItemClass('/blog')}>
                <BookOpen className="h-4 w-4" />
                Blog
              </Button>
            </Link>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="gap-2 rounded-lg text-[13px] font-medium h-8 px-3 text-[#606265] hover:text-[#383B3E] hover:bg-[#F2F2F2]"
              />
            }
          >
            <User className="h-4 w-4" />
            Account
            <ChevronDown className="h-3 w-3 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuPositioner align="end" sideOffset={4}>
              <DropdownMenuPopup>
                <DropdownMenuItem onClick={() => router.push('/account')}>
                  <Settings className="h-4 w-4" />
                  Manage Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuPopup>
            </DropdownMenuPositioner>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>
    </nav>
  );
}
