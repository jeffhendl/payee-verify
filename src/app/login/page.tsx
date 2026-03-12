import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { AuthForm } from '@/components/auth-form';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#045B3F] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0xMHYyaC00di0yaDR6bS0yMCAwaC0ydjRoMnYtNHptMCAyMGgtMnY0aDJ2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <Image src="/veripay-logo.png" alt="VeriPay" width={48} height={48} className="rounded-2xl" />
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-[-0.02em]">VeriPay</h1>
              <p className="text-[#D2F3A7] text-sm">by Loop</p>
            </div>
          </div>
          <h2 className="text-4xl font-semibold text-white leading-tight tracking-[-0.02em] mb-4">
            Verify your payees<br />before you pay.
          </h2>
          <p className="text-white/60 text-lg max-w-md leading-relaxed">
            AI-powered invoice verification that protects your business from payment fraud and errors.
          </p>
          <div className="mt-12 flex gap-8">
            <div>
              <p className="text-3xl font-semibold text-[#D2F3A7]">99%</p>
              <p className="text-white/50 text-sm mt-1">Accuracy rate</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-[#D2F3A7]">&lt;30s</p>
              <p className="text-white/50 text-sm mt-1">Verification time</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-[#D2F3A7]">24/7</p>
              <p className="text-white/50 text-sm mt-1">Always on</p>
            </div>
          </div>
        </div>
      </div>
      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <Image src="/veripay-logo.png" alt="VeriPay" width={36} height={36} className="rounded-xl" />
            <span className="font-semibold text-lg text-[#1D1D1D]">VeriPay</span>
          </div>
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
