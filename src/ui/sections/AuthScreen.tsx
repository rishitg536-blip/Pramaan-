import React, { useState } from 'react';
import { signIn, signUp, resetPassword } from '../../lib/supabase';
import { ShieldCheck, ArrowRight, Lock, Mail, Building2, User, KeyRound, AlertCircle, Laptop } from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (user: any) => void;
  onContinueLocal: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';
type AccountType = 'individual' | 'organisation';

const ORG_TYPES = [
  'Law firm',
  'Legal-aid organisation',
  'NGO / women’s-safety organisation',
  'Helpline or counselling service',
  'Cyber-forensics organisation',
  'Educational institution',
  'Government or public authority',
  'Other',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, onContinueLocal }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [accountType, setAccountType] = useState<AccountType>('individual');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Law firm');
  const [orgTypeDetails, setOrgTypeDetails] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both your email and password.');
        }
        const { user, error } = await signIn(email, password);
        if (error) throw error;
        if (user) onAuthenticated(user);
      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full name is required.');
        if (!email.trim()) throw new Error('Email is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        if (accountType === 'organisation') {
          if (!orgName.trim()) throw new Error('Organisation name is required.');
          if (orgType === 'Other' && !orgTypeDetails.trim()) {
            throw new Error('Please specify your organisation type details.');
          }
        }

        const { user, error } = await signUp({
          email,
          password,
          fullName: fullName.trim(),
          accountType,
          organizationName: accountType === 'organisation' ? orgName.trim() : undefined,
          organizationType: accountType === 'organisation' ? orgType : undefined,
          organizationTypeDetails: accountType === 'organisation' && orgType === 'Other' ? orgTypeDetails.trim() : undefined,
        });

        if (error) throw error;
        if (user) {
          setSuccessMessage('Account created successfully! Logging you in...');
          setTimeout(() => onAuthenticated(user), 600);
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) throw new Error('Please provide your email address.');
        const { success, error } = await resetPassword(email);
        if (error) throw error;
        if (success) {
          setSuccessMessage('Password reset instructions sent. Please check your inbox.');
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F2EFE2] text-ink overflow-y-auto selection:bg-yellow selection:text-ink">
      {/* Background Dot Matrix Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(15, 15, 15, 0.22) 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center min-h-screen">
        {/* Main High-Contrast Window Card */}
        <div className="bg-white border-3 border-ink shadow-[8px_8px_0px_#0F0F0F] rounded-lg overflow-hidden">
          {/* Top Window Bar */}
          <div className="bg-[#0F0F0F] px-4 py-3 border-b-3 border-ink flex items-center justify-between text-white">
            <div className="flex items-center space-x-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#E8452C] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FFE24A] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#35D07F] border border-white/40" />
              <span className="ml-3 font-mono text-xs sm:text-sm text-white font-black uppercase tracking-wider">
                PRAMAAN // ACCESS CONTROL
              </span>
            </div>

            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-yellow text-ink border border-ink shadow-brutal-sm">
              TLS ENCRYPTED
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Pramaan Brand Mark */}
            <div className="flex justify-center mb-6">
              <img
                src="/branding/Pramaan_logo.png"
                alt="Pramaan"
                className="w-48 sm:w-56 h-auto object-contain select-none"
              />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-black text-ink font-sans tracking-tight">
                Secure access to your cases
              </h1>
              <p className="mt-2 text-xs sm:text-sm font-mono text-muted">
                Sign in to organize and preserve case evidence securely.
              </p>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="mb-6 p-3.5 bg-red/10 border-2 border-red text-ink text-xs font-mono flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-6 p-3.5 bg-green/10 border-2 border-green text-emerald-950 text-xs font-mono flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-green shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Sign In / Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Type Selection on Sign Up */}
              {mode === 'signup' && (
                <div className="p-4 bg-[#FAF7EE] border-2 border-ink rounded-md space-y-3 mb-2">
                  <span className="text-xs font-mono font-bold text-ink uppercase tracking-wider block">
                    I am signing up as:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`py-2 px-3 text-xs font-mono font-bold border-2 border-ink flex items-center justify-center space-x-2 transition-all ${
                        accountType === 'individual'
                          ? 'bg-yellow text-ink shadow-[3px_3px_0px_#0F0F0F]'
                          : 'bg-white text-muted hover:bg-gray-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Individual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('organisation')}
                      className={`py-2 px-3 text-xs font-mono font-bold border-2 border-ink flex items-center justify-center space-x-2 transition-all ${
                        accountType === 'organisation'
                          ? 'bg-yellow text-ink shadow-[3px_3px_0px_#0F0F0F]'
                          : 'bg-white text-muted hover:bg-gray-100'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Organisation</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Organisation Specific Fields */}
              {mode === 'signup' && accountType === 'organisation' && (
                <div className="space-y-4 pt-1 border-t border-ink/20">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                      Organisation Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Legal & Forensics LLP"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                      Organisation Type *
                    </label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                    >
                      {ORG_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {orgType === 'Other' && (
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                        Organisation Type Details *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Please specify organisation focus"
                        value={orgTypeDetails}
                        onChange={(e) => setOrgTypeDetails(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Name for Sign Up */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    {accountType === 'organisation' ? 'Full Name of Registering User *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Adv. Rajesh Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                  {mode === 'signup' && accountType === 'organisation' ? 'Work Email *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="user@chamber.law"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password Input (Hidden in Forgot Password mode) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-bold uppercase text-ink">
                      Password *
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] font-mono text-muted hover:text-ink hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                    />
                    <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Confirm Password for Sign Up */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                    />
                    <KeyRound className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Main Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-yellow hover:bg-yellow/90 text-ink font-mono font-black text-sm uppercase tracking-wider border-2 border-ink shadow-[4px_4px_0px_#0F0F0F] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : mode === 'signin' ? (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Modes */}
            <div className="mt-6 pt-4 border-t border-ink/20 text-center text-xs font-mono">
              {mode === 'signin' ? (
                <div>
                  <span className="text-muted">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-ink underline hover:text-yellow"
                  >
                    Create account
                  </button>
                </div>
              ) : (
                <div>
                  <span className="text-muted">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-ink underline hover:text-yellow"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>

            {/* Optional Local-Mode Path (Secondary Option) */}
            <div className="mt-6 pt-6 border-t-2 border-dashed border-ink/30 text-center">
              <button
                type="button"
                onClick={onContinueLocal}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF7EE] text-ink font-mono text-xs font-bold border-2 border-ink shadow-[3px_3px_0px_#0F0F0F] transition-all flex items-center justify-center space-x-2"
              >
                <Laptop className="w-4 h-4 text-ink" />
                <span>Continue privately on this device</span>
              </button>
              <p className="mt-2 text-[10px] font-mono text-muted">
                Local mode • Cases stored on this device only • Zero cloud sync
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

