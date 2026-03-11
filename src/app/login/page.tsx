import { AuthForm } from '@/components/auth-form';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Green header band */}
      <div className="bg-[#045B3F] py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldCheck className="h-8 w-8 text-[#D2F3A7]" />
            <h1 className="text-3xl font-bold text-white">Payee Verify</h1>
          </div>
          <p className="text-[#D2F3A7]">Verify your payees before you pay. Powered by Loop.</p>
        </div>
      </div>
      {/* Auth form */}
      <div className="flex-1 bg-[#F2F2F2] flex items-start justify-center px-4 -mt-6">
        <AuthForm />
      </div>
    </div>
  );
}
