'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { authService } from '@/lib/api/services/auth.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check for registered success message
    if (searchParams.get('registered') === 'true') {
      setError('');
    }

    // Check for existing rate limit
    const rateLimitData = localStorage.getItem('loginRateLimit');
    if (rateLimitData) {
      const { attempts, timestamp } = JSON.parse(rateLimitData);
      const fifteenMinutes = 15 * 60 * 1000;
      const timePassed = Date.now() - timestamp;

      if (timePassed < fifteenMinutes && attempts >= 5) {
        setIsRateLimited(true);
        setLoginAttempts(attempts);
        setRateLimitTime(timestamp + fifteenMinutes);
      } else if (timePassed >= fifteenMinutes) {
        localStorage.removeItem('loginRateLimit');
      }
    }
  }, [searchParams]);

  // Rate limit countdown
  useEffect(() => {
    if (!isRateLimited || !rateLimitTime) return;

    const interval = setInterval(() => {
      const timeLeft = rateLimitTime - Date.now();
      if (timeLeft <= 0) {
        setIsRateLimited(false);
        setLoginAttempts(0);
        setRateLimitTime(null);
        localStorage.removeItem('loginRateLimit');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRateLimited, rateLimitTime]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    if (loading || isRateLimited) return; // Prevent double submission and rate limited attempts

    setLoading(true);
    setError('');

    try {
      const response = await authService.login(data.email, data.password);
      // Handle both access_token and accessToken formats
      const accessToken = response.access_token || response.accessToken;
      const refreshToken = response.refresh_token || response.refreshToken;

      if (!accessToken || !refreshToken) {
        throw new Error('Invalid response from server');
      }

      setAuth(response.user, accessToken, refreshToken);

      // Clear rate limit on successful login
      localStorage.removeItem('loginRateLimit');

      // Initialize FCM after successful login
      try {
        const { initializeFCM } = await import('@/lib/firebase/messaging');
        await initializeFCM();
      } catch (fcmError) {
        console.warn('FCM initialization failed:', fcmError);
        // Don't block login if FCM fails
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);

      // Increment login attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      const rateLimitData = {
        attempts: newAttempts,
        timestamp: Date.now(),
      };
      localStorage.setItem('loginRateLimit', JSON.stringify(rateLimitData));

      // Check if rate limit reached
      if (newAttempts >= 5) {
        setIsRateLimited(true);
        setRateLimitTime(Date.now() + 15 * 60 * 1000);
        setError('Too many failed login attempts. Please try again in 15 minutes.');
      } else {
        // Handle network errors specifically
        if (err.isNetworkError || err.message?.includes('Network Error') || err.code === 'ECONNABORTED') {
          setError('Cannot connect to server. Please ensure the backend is running on http://localhost:8000');
        } else if (err.response?.status === 0 || !err.response) {
          setError('Network Error: Backend server is not running. Please start the Django server.');
        } else {
          const errorMessage = err.response?.data?.detail ||
            err.response?.data?.non_field_errors?.[0] ||
            err.message ||
            'Login failed. Please check your credentials and try again.';
          setError(`${errorMessage} (Attempt ${newAttempts}/5)`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1da9c3] to-[#0d7a8f] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-[#1da9c3]">RF</span>
            </div>
            <span className="text-2xl font-bold text-white">ResolveFast</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">Welcome Back!</h1>
          <p className="text-xl text-white/90 leading-relaxed">Manage complaints efficiently with our powerful platform</p>
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Real-time Tracking</h3>
              <p className="text-white/80 text-sm">Monitor complaint status instantly</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Fast Resolution</h3>
              <p className="text-white/80 text-sm">Quick assignment and resolution</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sign In</h2>
            <p className="text-gray-600 dark:text-gray-400">Enter your credentials to access your account</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            {searchParams.get('registered') === 'true' && !error && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm text-green-800 dark:text-green-200">Registration successful! Please sign in.</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  disabled={loading || isRateLimited}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  placeholder="Enter your email"
                />
                {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <Link href="#" className="text-xs text-[#1da9c3] hover:text-[#178a9f] font-medium">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={loading || isRateLimited}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isRateLimited}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-[#1da9c3] hover:bg-[#178a9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1da9c3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">New here?</span>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full flex justify-center py-3 px-4 text-sm font-semibold rounded-xl text-[#1da9c3] bg-[#1da9c3]/10 hover:bg-[#1da9c3]/20 transition-all"
            >
              Create an account
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}