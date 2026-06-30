import { useState, useId } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';

export function FloatingLabelInput({
  label,
  type = 'text',
  icon: Icon,
  value = '',
  onChange,
  accentColor = '#C4654A',
  isValid = false,
  showSuccessCheckmark = false,
  error = '',
  required,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();

  const isFilled = value !== undefined && value !== null && String(value).length > 0;
  const isFloated = focused || isFilled;
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const hasRightSlot = isPassword || (showSuccessCheckmark && isValid);
  const leftPad = Icon ? 42 : 16;
  const rightPad = hasRightSlot ? 42 : 16;

  return (
    <div className="w-full">
      <div className="relative" style={{ height: 58 }}>
        {/* Left Icon */}
        {Icon && (
          <div
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: focused ? accentColor : 'rgba(0,0,0,0.3)',
              zIndex: 2,
              transition: 'color 0.2s',
            }}
          >
            <Icon size={16} strokeWidth={2} />
          </div>
        )}

        {/* Floating Label */}
        <label
          htmlFor={id}
          className="absolute pointer-events-none select-none"
          style={{
            left: leftPad,
            top: isFloated ? 9 : '50%',
            transform: isFloated ? 'none' : 'translateY(-50%)',
            fontSize: isFloated ? 9.5 : 14,
            fontWeight: isFloated ? 700 : 400,
            color: isFloated ? accentColor : 'rgba(0,0,0,0.38)',
            letterSpacing: isFloated ? '0.05em' : 0,
            textTransform: isFloated ? 'uppercase' : 'none',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </label>

        {/* Input */}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          aria-label={label}
          className="absolute inset-0 w-full h-full rounded-xl text-sm font-medium"
          style={{
            paddingLeft: leftPad,
            paddingRight: rightPad,
            paddingTop: isFloated ? 22 : 0,
            paddingBottom: 0,
            background: '#ffffff',
            border: `1.5px solid ${focused ? accentColor : 'rgba(0,0,0,0.14)'}`,
            color: '#111111',
            outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${accentColor}22` : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            caretColor: accentColor,
          }}
          // Hide placeholder until floated to avoid conflict with label
          placeholder={isFloated ? '' : ''}
          {...props}
        />

        {/* Right Slot: eye toggle or checkmark */}
        {hasRightSlot && (
          <div
            className="absolute flex items-center justify-center"
            style={{
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 3,
            }}
          >
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            ) : (
              showSuccessCheckmark && isValid && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    borderRadius: '50%',
                    padding: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </div>
              )
            )}
          </div>
        )}
      </div>

      {error && (
        <p
          className="text-xs font-medium mt-1.5 pl-1"
          style={{ color: '#EF4444' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
