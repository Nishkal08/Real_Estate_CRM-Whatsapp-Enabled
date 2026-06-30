import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, Phone, ArrowRight, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { BrandPanel } from '@/components/ui/BrandPanel';
import useAuthStore from '@/stores/authStore';
import { toast } from '@/stores/uiStore';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    phone: '',
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Entrance animation
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [step]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isEmailValid = validateEmail(form.email);

  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };

  const passwordStrength = calculateStrength(form.password);
  const strengthMeta = (() => {
    switch (passwordStrength) {
      case 1: return { label: 'Weak', color: '#EF4444', filled: 1 };
      case 2: return { label: 'Fair', color: '#F59E0B', filled: 2 };
      case 3: return { label: 'Good', color: '#10B981', filled: 3 };
      case 4: return { label: 'Strong', color: '#047857', filled: 4 };
      default: return { label: 'Too short', color: 'rgba(0,0,0,0.25)', filled: 0 };
    }
  })();

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

  const handlePrevStep = () => { if (step > 1) setStep(step - 1); };

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

  // Stagger helper
  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.45s ${0.05 + i * 0.07}s ease-out, transform 0.45s ${0.05 + i * 0.07}s ease-out`,
  });

  const ACCENT = '#5DCAA5';

  const reviewFields = [
    { label: 'Full Name', value: form.name, icon: <User size={13} /> },
    { label: 'Work Email', value: form.email, icon: <Mail size={13} /> },
    { label: 'Company', value: form.businessName, icon: <Briefcase size={13} /> },
    { label: 'Phone', value: form.phone, icon: <Phone size={13} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', background: '#0E1F18' }}>

      {/* Inline styles */}
      <style>{`
        .reg-btn-primary {
          transition: transform 0.18s ease, box-shadow 0.18s ease !important;
        }
        .reg-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 24px rgba(93,202,165,0.3) !important;
        }
        .reg-btn-primary:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .reg-btn-outline {
          transition: transform 0.18s ease, border-color 0.2s, background 0.2s !important;
        }
        .reg-btn-outline:hover:not(:disabled) {
          border-color: rgba(0,0,0,0.22) !important;
          background: rgba(0,0,0,0.025) !important;
          transform: translateY(-1px) !important;
        }
        .reg-link:hover {
          text-decoration: underline !important;
        }
      `}</style>

      {/* Left brand panel */}
      <BrandPanel
        bgColor="#0E1F18"
        headline="Set up your AI sales workspace"
        subtitle="Takes about 2 minutes. No credit card needed to start."
        accentColor={ACCENT}
        stats={[]}
      />

      {/* Right form panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 52px',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Warm edge blend */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 60,
            height: '100%',
            background: 'linear-gradient(to right, rgba(14,31,24,0.04), transparent)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

          {/* Progress bar */}
          <div style={{ marginBottom: 32, ...stagger(0) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.3)', marginBottom: 10 }}>
              <span>Step {step} of 3</span>
              <span>{step === 1 ? 'Personal Info' : step === 2 ? 'Company Details' : 'Verify & Launch'}</span>
            </div>
            <div style={{ height: 4, width: '100%', background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 99,
                  transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                  width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%',
                  background: `linear-gradient(90deg, ${ACCENT}, #3db88f)`,
                }}
              />
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 32, ...stagger(1) }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#0F0F0F',
                lineHeight: 1.15,
                marginBottom: 8,
              }}
            >
              {step === 1 ? 'Create your account' : step === 2 ? 'Tell us about your business' : 'Ready to start?'}
            </h2>
            <p style={{ fontSize: 14, color: '#888888', fontWeight: 400, lineHeight: 1.5 }}>
              {step === 1
                ? 'Get your AI sales assistant running in minutes'
                : step === 2
                  ? 'We configure the agent based on your company details'
                  : 'Confirm your credentials and launch your workspace'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}>

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={stagger(2)}>
                  <FloatingLabelInput
                    label="Full Name"
                    hint="e.g. Raj Sharma"
                    type="text"
                    icon={User}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    accentColor={ACCENT}
                    required
                  />
                </div>

                <div style={stagger(3)}>
                  <FloatingLabelInput
                    label="Work Email"
                    hint="you@company.com"
                    type="email"
                    icon={Mail}
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    accentColor={ACCENT}
                    isValid={isEmailValid}
                    showSuccessCheckmark={true}
                    required
                  />
                </div>

                <div style={stagger(4)}>
                  <FloatingLabelInput
                    label="Password"
                    hint="Min 8 characters"
                    type="password"
                    icon={Lock}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    accentColor={ACCENT}
                    required
                  />

                  {/* Strength meter */}
                  {form.password && (
                    <div style={{ padding: '8px 4px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(0,0,0,0.3)' }}>
                          Strength
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: strengthMeta.color }}>
                          {strengthMeta.label}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                        {[1, 2, 3, 4].map(idx => (
                          <div
                            key={idx}
                            style={{
                              height: 3,
                              borderRadius: 99,
                              transition: 'background 0.3s',
                              background: idx <= strengthMeta.filled ? strengthMeta.color : 'rgba(0,0,0,0.08)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Company Details ── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={stagger(2)}>
                  <FloatingLabelInput
                    label="Company Name"
                    hint="e.g. SolarBright Technologies"
                    type="text"
                    icon={Briefcase}
                    value={form.businessName}
                    onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    accentColor={ACCENT}
                    required
                  />
                </div>

                <div style={stagger(3)}>
                  <FloatingLabelInput
                    label="WhatsApp Business Phone"
                    hint="+91 98765 43210"
                    type="tel"
                    icon={Phone}
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    accentColor={ACCENT}
                    required
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Confirmation ── */}
            {step === 3 && (
              <div style={stagger(2)}>
                <div
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(0,0,0,0.018)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Review header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: ACCENT }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#333' }}>
                      Review your details
                    </span>
                  </div>

                  {/* Review rows */}
                  {reviewFields.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 20px',
                        borderBottom: i < reviewFields.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      }}
                    >
                      <div style={{ color: 'rgba(0,0,0,0.25)', flexShrink: 0, display: 'flex' }}>
                        {f.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.3)', marginBottom: 2 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Button actions ── */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 24, ...stagger(step === 3 ? 3 : 5) }}>
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="reg-btn-outline"
                  style={{
                    flex: step === 3 ? '0 0 auto' : 1,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 600,
                    borderColor: 'rgba(0,0,0,0.12)',
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}
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
                  className="reg-btn-primary"
                  style={{
                    flex: 1,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 700,
                    background: ACCENT,
                    borderColor: ACCENT,
                    color: 'rgb(255, 255, 255)',
                    letterSpacing: '-0.01em',
                  }}
                  onClick={handleNextStep}
                  iconRight={<ArrowRight size={15} />}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  className="reg-btn-primary"
                  style={{
                    flex: 1,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 700,
                    background: ACCENT,
                    borderColor: ACCENT,
                    color: '#0d0d0d',
                    letterSpacing: '-0.01em',
                  }}
                  loading={isLoading}
                  iconRight={<ArrowRight size={15} />}
                >
                  Create account
                </Button>
              )}
            </div>
          </form>

          {/* Footer */}
          <p style={{ fontSize: 13, textAlign: 'center', marginTop: 32, color: 'rgba(0,0,0,0.38)', fontWeight: 450, ...stagger(6) }}>
            Already have an account?{' '}
            <Link
              to="/login"
              className="reg-link"
              style={{ color: ACCENT, fontWeight: 700, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>

          {/* Trust badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              marginTop: 24,
              ...stagger(7),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Shield size={11} style={{ color: 'rgba(0,0,0,0.2)' }} />
              <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', fontWeight: 600, letterSpacing: '0.02em' }}>
                256-bit encrypted
              </span>
            </div>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.12)' }} />
            <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', fontWeight: 600, letterSpacing: '0.02em' }}>
              No credit card required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
