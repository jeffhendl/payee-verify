'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Must include a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Must include a number';
  return null;
}

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      // Validate password
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }

      if (!companyName.trim()) {
        setError('Company name is required');
        setLoading(false);
        return;
      }

      if (!firstName.trim()) {
        setError('First name is required');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        // Auto-login after signup (skip email confirmation for hackathon)
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
          setMessage('Account created! Please sign in.');
        } else {
          router.push('/');
          router.refresh();
        }
      }
    }

    setLoading(false);
  };

  const passwordStrength = !isLogin && password.length > 0 ? validatePassword(password) : null;

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
        {!isLogin && (
          <>
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-[13px] font-medium text-[#383B3E]">Company name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Acme Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="h-11 rounded-xl bg-[#F7F7F7] border-transparent text-[15px] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#045B3F] focus:ring-2 focus:ring-[#045B3F]/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[13px] font-medium text-[#383B3E]">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-[#F7F7F7] border-transparent text-[15px] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#045B3F] focus:ring-2 focus:ring-[#045B3F]/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[13px] font-medium text-[#383B3E]">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 rounded-xl bg-[#F7F7F7] border-transparent text-[15px] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#045B3F] focus:ring-2 focus:ring-[#045B3F]/10"
                />
              </div>
            </div>
          </>
        )}

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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={isLogin ? 'Enter your password' : 'Min 8 chars, uppercase, lowercase, number'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? 1 : 8}
              className="h-11 rounded-xl bg-[#F7F7F7] border-transparent text-[15px] placeholder:text-[#A1A1AA] focus:bg-white focus:border-[#045B3F] focus:ring-2 focus:ring-[#045B3F]/10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#71717A]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!isLogin && password.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="flex gap-1">
                {[
                  password.length >= 8,
                  /[A-Z]/.test(password),
                  /[a-z]/.test(password),
                  /[0-9]/.test(password),
                ].map((met, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${met ? 'bg-[#30AC2E]' : 'bg-[#E5E5E5]'}`} />
                ))}
              </div>
              <p className={`text-xs ${passwordStrength ? 'text-[#F12D1B]' : 'text-[#30AC2E]'}`}>
                {passwordStrength || 'Password meets requirements'}
              </p>
            </div>
          )}
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
