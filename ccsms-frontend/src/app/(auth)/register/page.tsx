'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { authService } from '@/lib/api/services/auth.service';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const registerSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirm_password: z.string(),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^(\+91)?[6-9]\d{9}$/.test(val), {
      message: 'Phone must be a valid 10-digit Indian number (optionally with +91)',
    }),
  role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']),
  pincode: z.string()
    .optional()
    .refine((val) => !val || /^\d{6}$/.test(val), {
      message: 'Pincode must be exactly 6 digits',
    }),
  service_type: z.string().optional(),
  service_card_id: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'CUSTOMER',
    },
  });

  const selectedRole = watch('role');
  const password = watch('password');

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  }, [password]);

  const onSubmit = async (data: RegisterFormData) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      // Remove empty optional fields
      const submitData = {
        ...data,
        phone: data.phone || undefined,
        pincode: data.pincode || undefined,
        service_type: data.service_type || undefined,
        service_card_id: data.service_card_id || undefined,
      };

      await authService.register(submitData);
      router.push('/login?registered=true');
    } catch (err: any) {
      const errorMessage = err.response?.data?.email?.[0] ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">Join Us Today!</h1>
          <p className="text-xl text-white/90 leading-relaxed">Create your account and start managing complaints efficiently</p>
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Multi-Role Support</h3>
              <p className="text-white/80 text-sm">Customer, Agent, or Admin access</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Secure Platform</h3>
              <p className="text-white/80 text-sm">Your data is safe with us</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
            <p className="text-gray-600 dark:text-gray-400">Fill in your details to get started</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                <input
                  {...register('first_name')}
                  type="text"
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                  placeholder="John"
                />
                {errors.first_name && <p className="text-red-500 text-xs mt-1.5">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                <input
                  {...register('last_name')}
                  type="text"
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                  placeholder="Doe"
                />
                {errors.last_name && <p className="text-red-500 text-xs mt-1.5">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                placeholder="john@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone (Optional)</label>
              <input
                {...register('phone')}
                type="tel"
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
              <select
                {...register('role')}
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pincode (Optional)</label>
              <input
                {...register('pincode')}
                type="text"
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                placeholder="123456"
              />
            </div>

            {selectedRole === 'AGENT' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Service Type</label>
                  <input
                    {...register('service_type')}
                    type="text"
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                    placeholder="Electronics, Appliances, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Service Card ID (Optional)</label>
                  <input
                    {...register('service_card_id')}
                    type="text"
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                    placeholder="Enter service card ID"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  disabled={loading}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                  placeholder="Min. 8 characters with uppercase, lowercase, number & special char"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                      passwordStrength.label === 'Medium' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirm_password')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  disabled={loading}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent disabled:opacity-50 transition-all"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1.5">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-[#1da9c3] hover:bg-[#178a9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1da9c3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">Already registered?</span>
              </div>
            </div>

            <Link
              href="/login"
              className="w-full flex justify-center py-3 px-4 text-sm font-semibold rounded-xl text-[#1da9c3] bg-[#1da9c3]/10 hover:bg-[#1da9c3]/20 transition-all"
            >
              Sign in to your account
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}