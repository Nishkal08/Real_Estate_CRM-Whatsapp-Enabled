import { Zap } from 'lucide-react';

export function BrandPanel({
  bgColor,
  headline,
  subtitle,
  accentColor = '#D85A30',
  stats = []
}) {
  const hasStats = stats && stats.length > 0;

  return (
    <div
      className="relative flex flex-col overflow-hidden select-none"
      style={{
        background: bgColor,
        width: '40%',
        minHeight: '100vh',
        padding: '40px 44px',
        flexShrink: 0,
      }}
    >
      {/* CSS Keyframes injected once */}
      <style>{`
        @keyframes aurionDrift1 {
          0%   { transform: translate(0px, 0px); }
          50%  { transform: translate(14px, -14px); }
          100% { transform: translate(0px, 0px); }
        }
        @keyframes aurionDrift2 {
          0%   { transform: translate(0px, 0px); }
          50%  { transform: translate(-12px, 18px); }
          100% { transform: translate(0px, 0px); }
        }
        @keyframes aurionDrift3 {
          0%   { transform: translate(0px, 0px); }
          50%  { transform: translate(16px, 10px); }
          100% { transform: translate(0px, 0px); }
        }
      `}</style>

      {/* Decorative drifting orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-60px', left: '-80px',
          width: 320, height: 320,
          borderRadius: '50%',
          background: accentColor,
          opacity: 0.18,
          filter: 'blur(90px)',
          animation: 'aurionDrift1 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '5%', right: '-60px',
          width: 280, height: 280,
          borderRadius: '50%',
          background: accentColor,
          opacity: 0.14,
          filter: 'blur(80px)',
          animation: 'aurionDrift2 26s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '42%', left: '30%',
          width: 200, height: 200,
          borderRadius: '50%',
          background: accentColor,
          opacity: 0.10,
          filter: 'blur(70px)',
          animation: 'aurionDrift3 16s ease-in-out infinite',
        }}
      />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5 mb-auto">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: accentColor,
            boxShadow: `0 4px 14px ${accentColor}55`,
          }}
        >
          <Zap size={16} color="#fff" strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            fontFamily: 'inherit',
          }}
        >
          Aurion
        </span>
      </div>

      {/* Center Copy */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
        <h1
          style={{
            fontWeight: 800,
            fontSize: 'clamp(26px, 3.5vw, 38px)',
            color: '#ffffff',
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            fontFamily: 'inherit',
            marginBottom: 16,
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7,
            fontWeight: 400,
            maxWidth: 300,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Footer Stats */}
      {hasStats && (
        <div
          className="relative z-10"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {stats.map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasStats && (
        <div
          className="relative z-10"
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 700,
          }}
        >
          Intelligence Platform · Aurion CRM
        </div>
      )}
    </div>
  );
}
