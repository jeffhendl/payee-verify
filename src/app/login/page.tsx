import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payee Verify</h1>
          <p className="text-gray-500 mt-2">Invoice payee verification made simple</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
