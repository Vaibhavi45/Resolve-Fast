'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Users, Clock, Shield, Zap, TrendingUp, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useAuthHydration } from '@/hooks/useAuthHydration';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useAuthHydration();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    console.log('[Landing Page] Auth check:', { hydrated, isAuthenticated });
    // Only redirect authenticated users to dashboard
    if (hydrated && isAuthenticated) {
      console.log('[Landing Page] Redirecting authenticated user to dashboard');
      router.push('/dashboard/');
    } else if (hydrated) {
      console.log('[Landing Page] Showing landing page to non-authenticated user');
    }
  }, [isAuthenticated, hydrated, router]);

  // Show loading only for authenticated users being redirected
  if (hydrated && isAuthenticated) {
    console.log('[Landing Page] Rendering redirect loading screen');
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <p className="text-gray-400">Redirecting to dashboard...</p>
      </div>
    );
  }

  console.log('[Landing Page] Rendering full landing page');

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className={`min-h-screen transition-colors duration-300 ${isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-cyan-50 to-white'
        }`}>
        {/* Navigation */}
        <nav className={`fixed top-0 w-full backdrop-blur-lg border-b z-50 transition-colors ${isDark
            ? 'bg-slate-900/80 border-slate-700/50'
            : 'bg-white/80 border-gray-200'
          }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Shield className={`h-8 w-8 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ResolveFast
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${isDark
                      ? 'hover:bg-slate-800 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${isDark
                      ? 'text-white hover:text-cyan-400'
                      : 'text-gray-700 hover:text-cyan-600'
                    }`}
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                Complaint Management
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-cyan-700">
                  Revolutionized & Simplified.
                </span>
              </h1>
              <p className={`text-lg sm:text-xl mb-8 max-w-3xl mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'
                }`}>
                Transform your customer service with AI-powered complaint resolution.
                Reduce response times by 60% and increase customer satisfaction with intelligent automation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => router.push('/register')}
                  className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-cyan-500/30"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className={`px-8 py-4 font-semibold rounded-lg transition-all border ${isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300'
                    }`}
                >
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={`py-16 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-slate-800/30' : 'bg-cyan-50/50'
          }`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`text-center p-6 rounded-xl border transition-all hover:shadow-lg ${isDark
                  ? 'bg-slate-900/50 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400'
                }`}>
                <div className={`text-5xl font-bold mb-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'
                  }`}>40%</div>
                <div className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Faster Resolution Time
                </div>
              </div>
              <div className={`text-center p-6 rounded-xl border transition-all hover:shadow-lg ${isDark
                  ? 'bg-slate-900/50 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400'
                }`}>
                <div className={`text-5xl font-bold mb-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'
                  }`}>95%</div>
                <div className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Customer Satisfaction
                </div>
              </div>
              <div className={`text-center p-6 rounded-xl border transition-all hover:shadow-lg ${isDark
                  ? 'bg-slate-900/50 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400'
                }`}>
                <div className={`text-5xl font-bold mb-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'
                  }`}>100%</div>
                <div className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Customer Transparency
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                Why Choose ResolveFast?
              </h2>
              <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'
                }`}>
                We help you deliver exceptional customer service with cutting-edge technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className={`p-6 rounded-xl border transition-all hover:transform hover:scale-105 ${isDark
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
                }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-cyan-600/20' : 'bg-cyan-100'
                  }`}>
                  <Zap className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Multi-channel Intake</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Accept complaints from email, web portal, mobile app, and phone - all in one unified platform.
                </p>
              </div>

              {/* Feature 2 */}
              <div className={`p-6 rounded-xl border transition-all hover:transform hover:scale-105 ${isDark
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
                }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-cyan-600/20' : 'bg-cyan-100'
                  }`}>
                  <Users className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>AI-Powered Assignment</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Intelligent routing assigns complaints to the best-suited agents based on expertise and workload.
                </p>
              </div>

              {/* Feature 3 */}
              <div className={`p-6 rounded-xl border transition-all hover:transform hover:scale-105 ${isDark
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
                }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-cyan-600/20' : 'bg-cyan-100'
                  }`}>
                  <Clock className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>SLA Tracking</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Automated SLA monitoring with escalation alerts ensures no complaint falls through the cracks.
                </p>
              </div>

              {/* Feature 4 */}
              <div className={`p-6 rounded-xl border transition-all hover:transform hover:scale-105 ${isDark
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
                }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-cyan-600/20' : 'bg-cyan-100'
                  }`}>
                  <BarChart3 className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Analytics & Reporting</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Comprehensive dashboards provide real-time insights into complaint trends and agent performance.
                </p>
              </div>

              {/* Feature 5 */}
              <div className={`p-6 rounded-xl border transition-all hover:transform hover:scale-105 ${isDark
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
                }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-cyan-600/20' : 'bg-cyan-100'
                  }`}>
                  <Shield className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Secure & Compliant</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Enterprise-grade security with complete audit trails and GDPR compliance built-in.
                </p>
              </div>

              {/* Feature 6 */}
              <div className={`p-6 rounded-xl border transition-all hover:transform hover:scale-105 ${isDark
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/50'
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
                }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-cyan-600/20' : 'bg-cyan-100'
                  }`}>
                  <TrendingUp className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Real-time Notifications</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Instant push notifications keep everyone informed about complaint status changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-slate-800/30' : 'bg-cyan-50/50'
          }`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                How ResolveFast Works
              </h2>
              <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'
                }`}>
                Simple, streamlined process from complaint to resolution
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                  1
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Complaint Intake</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Customers submit complaints through their preferred channel
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                  2
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Smart Assignment</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  AI automatically routes to the best-suited agent
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                  3
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Rapid Resolution</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Agents work efficiently with all tools in one place
                </p>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                  4
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Customer Feedback</h3>
                <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                  Collect ratings and continuously improve service
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-12 shadow-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to optimize your service?
              </h2>
              <p className="text-lg text-cyan-50 mb-8">
                Join hundreds of companies already using ResolveFast to deliver exceptional customer service
              </p>
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-4 bg-white text-cyan-600 font-bold rounded-lg hover:bg-cyan-50 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Your Free Trial
              </button>
              <p className="text-sm text-cyan-50 mt-4">No credit card required • 14-day free trial</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-12 px-4 sm:px-6 lg:px-8 border-t ${isDark
            ? 'bg-slate-900 border-slate-700/50'
            : 'bg-gray-50 border-gray-200'
          }`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <Shield className={`h-6 w-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>ResolveFast</span>
              </div>
              <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                © 2026 ResolveFast. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}