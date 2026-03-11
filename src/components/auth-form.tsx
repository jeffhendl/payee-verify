'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a confirmation link.');
      }
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">
        {isLogin ? 'Welcome back' : 'Create your account'}
      </h2>
      <p className="text-[#71717A] mt-2 text-[15px]">
        {isLogin
          ? 'Sign in to manage your invoice verifications'
          : 'Get started with payee verification in minutes'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-medium text-[#383B3E]">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl bg-[#F7F7F7] border-transparent text-[15px] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#045B3F] focus:ring-2 focus:ring-[#045B3F]/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-medium text-[#383B3E]">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11 rounded-xl bg-[#F7F7F7] border-transparent text-[15px] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#045B3F] focus:ring-2 focus:ring-[#045B3F]/10"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {message && (
          <div className="rounded-xl bg-[#F2FCE4] border border-[#D2F3A7] px-4 py-3">
            <p className="text-sm text-[#045B3F]">{message}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-[#045B3F] hover:bg-[#034830] text-[15px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(4,91,63,0.15)]"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLogin ? 'Sign in' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-[#71717A]">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="font-medium text-[#045B3F] hover:text-[#034830]"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}
