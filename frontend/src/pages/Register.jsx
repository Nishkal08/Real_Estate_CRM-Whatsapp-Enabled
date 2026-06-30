import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, Phone, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { BrandPanel } from '@/components/ui/BrandPanel';
import useAuthStore from '@/stores/authStore';
import { toast } from '@/stores/uiStore';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    phone: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isEmailValid = validateEmail(form.email);

  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const passwordStrength = calculateStrength(form.password);

  const getStrengthMeta = (score) => {
    switch (score) {
      case 1:
        return { label: 'Weak', color: '#EF4444', filled: 1 };
      case 2:
        return { label: 'Fair', color: '#F59E0B', filled: 2 };
      case 3:
        return { label: 'Good', color: '#10B981', filled: 3 };
      case 4:
        return { label: 'Strong', color: '#047857', filled: 4 };
      default:
        return { label: 'Too short', color: 'var(--text-disabled)', filled: 0 };
    }
  };

  const strengthMeta = getStrengthMeta(passwordStrength);

  const handleNextStep = () => {
    if (step === 1) {
      if (!form.name.trim()) return toast.error('Please enter your full name');
      if (!isEmailValid) return toast.error('Please enter a valid email address');
      if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
      setStep(2);
    } else if (step === 2) {
      if (!form.businessName.trim()) return toast.error('Please enter your business/company name');
      if (!form.phone.trim()) return toast.error('Please enter a phone number');
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.businessName || !form.phone) {
      return toast.error('Please complete all steps before creating your account');
    }

    const result = await register(form.name, form.email, form.password, form.businessName, form.phone);
    
    if (result.success) {
      toast.success('Account created successfully! Welcome to Aurion.');
      navigate('/dashboard');
    } else {
      if (result.error === 'Email already registered') {
        toast.error('This email is already registered. Redirecting to login...', { duration: 3000 });
        setTimeout(() => navigate('/login'), 1500);
      } else {
        toast.error(result.error || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', background: '#0E1F18' }}>
      {/* Brand left panel (40% width) */}
      <BrandPanel
        bgColor="#0E1F18"
        headline="Set up your AI sales workspace"
        subtitle="Takes about 2 minutes. No credit card needed to start."
        accentColor="#5DCAA5"
        stats={[]}
      />

      {/* Form right panel (60% width) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 44px', background: '#ffffff' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>
              <span>Step {step} of 3</span>
              <span>{step === 1 ? 'Personal Info' : step === 2 ? 'Company Details' : 'Verify & Launch'}</span>
            </div>
            <div style={{ height: 5, width: '100%', background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 99,
                  transition: 'width 0.35s ease',
                  width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%',
                  background: '#5DCAA5'
                }}
              />
            </div>
          </div>

          {/* Form Header */}
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#111111', lineHeight: 1.2, marginBottom: 6, fontFamily: 'inherit' }}
            >
              {step === 1 ? 'Create your account' : step === 2 ? 'Tell us about your business' : 'Ready to start?'}
            </h2>
            <p style={{ fontSize: 13, color: '#777777', fontWeight: 400 }}>
              {step === 1
                ? 'Get your AI sales assistant running in minutes'
                : step === 2
                ? 'We configure the agent based on your company details'
                : 'Confirm your credentials and generate your workspace'}
            </p>
          </div>

          <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()} className="space-y-5">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <FloatingLabelInput
                  label="Full Name"
                  type="text"
                  icon={User}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Raj Sharma"
                  accentColor="#5DCAA5"
                  required
                />

                <FloatingLabelInput
                  label="Work Email"
                  type="email"
                  icon={Mail}
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="raj@company.com"
                  accentColor="#5DCAA5"
                  isValid={isEmailValid}
                  showSuccessCheckmark={true}
                  required
                />

                <div className="space-y-2">
                  <FloatingLabelInput
                    label="Password"
                    type="password"
                    icon={Lock}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    accentColor="#5DCAA5"
                    required
                  />

                  {/* Password Strength Meter */}
                  {form.password && (
                    <div className="px-1.5 py-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                          Strength
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: strengthMeta.color }}>
                          {strengthMeta.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map(idx => (
                          <div
                            key={idx}
                            className="h-1 rounded-full transition-all duration-300"
                            style={{
                              background: idx <= strengthMeta.filled ? strengthMeta.color : 'var(--border-subtle)'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Company Details */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <FloatingLabelInput
                  label="Company Name"
                  type="text"
                  icon={Briefcase}
                  value={form.businessName}
                  onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                  placeholder="SolarBright Technologies"
                  accentColor="#5DCAA5"
                  required
                />

                <FloatingLabelInput
                  label="WhatsApp Business Phone"
                  type="tel"
                  icon={Phone}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  accentColor="#5DCAA5"
                  required
                />
              </div>
            )}

            {/* Step 3: Confirmation Summary */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in p-5 rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-3 mb-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <CheckCircle2 className="text-[var(--success)]" size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Review Settings</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-disabled)' }}>Full Name</span>
                    <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{form.name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-disabled)' }}>Work Email</span>
                    <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{form.email}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-disabled)' }}>Company Name</span>
                    <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{form.businessName}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-disabled)' }}>Phone Contact</span>
                    <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{form.phone}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Button Actions */}
            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 justify-center rounded-xl text-sm font-semibold transition-all"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  onClick={handlePrevStep}
                  icon={<ArrowLeft size={15} />}
                >
                  Back
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  className="flex-grow h-12 justify-center rounded-xl text-sm font-semibold transition-all"
                  style={{ background: '#5DCAA5', borderColor: '#5DCAA5', color: '#0d0d0d' }}
                  onClick={handleNextStep}
                  iconRight={<ArrowRight size={15} />}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-grow h-12 justify-center rounded-xl text-sm font-semibold transition-all"
                  style={{ background: '#5DCAA5', borderColor: '#5DCAA5', color: '#0d0d0d' }}
                  loading={isLoading}
                  iconRight={<ArrowRight size={15} />}
                >
                  Create account
                </Button>
              )}
            </div>
          </form>

          {/* Footer Link */}
          <p style={{ fontSize: 12, textAlign: 'center', marginTop: 28, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: '#5DCAA5', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
