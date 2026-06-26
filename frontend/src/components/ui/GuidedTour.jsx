import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

const TOUR_STEPS = [
  {
    selector: '[data-tour="sidebar"]',
    route: '/dashboard',
    title: 'Navigation Hub',
    content: 'AURION centers all modules here. Easily switch between leads, active campaign automation, chat logs, and agent sandboxes.',
    placement: 'right'
  },
  {
    selector: '[data-tour="topbar"]',
    route: '/dashboard',
    title: 'Global Control Center',
    content: 'Monitor live system health, toggle dark mode, search records, or manually restart this tour using the help icon.',
    placement: 'bottom'
  },
  {
    selector: '[data-tour="agent-engine"]',
    route: '/dashboard',
    title: 'AI Agent Heartbeat',
    content: 'View your live AI status card. The pulsing wave graph animates in real-time to represent active lead monitoring.',
    placement: 'left'
  },
  {
    selector: '[data-tour="new-campaign"]',
    route: '/dashboard',
    title: 'Launch Campaigns',
    content: 'Start new campaigns instantly! Upload leads, choose agent tones, configure multilingual prompts, and go live.',
    placement: 'bottom'
  },
  {
    selector: '[data-tour="conversations-link"]',
    route: '/dashboard',
    title: 'Conversations & Human Takeover',
    content: 'Monitor automated chats. Check qualification scores and click "Take Over" to chat manually with hot leads.',
    placement: 'right'
  },
  {
    selector: '[data-tour="content-studio-link"]',
    route: '/dashboard',
    title: 'Content Studio',
    content: 'Generate localized, high-conversion WhatsApp templates automatically. Use Case: Craft personalized property list pitches or follow-ups matching your campaign rules.',
    placement: 'right'
  },
  {
    selector: '[data-tour="booking-link"]',
    route: '/dashboard',
    title: 'Booking Agent Config',
    content: 'Configure the AI agent to dynamically schedule property viewings on your calendar. Use Case: The AI detects scheduling intent, offers available slots, and books appointments seamlessly.',
    placement: 'right'
  },
  {
    selector: '[data-tour="ai-tester-link"]',
    route: '/dashboard',
    title: 'AI Sandbox',
    content: 'Test and debug your AI agent\'s responses in a safe environment. Use Case: Roleplay with your custom agents in real-time to preview how they respond to tough lead objections.',
    placement: 'right'
  }
];

export function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Automatically trigger for new users
    const completed = localStorage.getItem('real_estate_crm_tour_completed');
    if (!completed) {
      // Delay slightly for render cycles to finish
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen to manual restart events
  useEffect(() => {
    const handleRestart = () => {
      setStepIndex(0);
      setIsOpen(true);
    };
    window.addEventListener('start-guided-tour', handleRestart);
    return () => window.removeEventListener('start-guided-tour', handleRestart);
  }, []);

  // Handle automatic routing for steps that require specific pages
  useEffect(() => {
    if (!isOpen || stepIndex >= TOUR_STEPS.length) return;
    const step = TOUR_STEPS[stepIndex];
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [stepIndex, isOpen, navigate]);

  // Measure targeted element bounds dynamically
  useEffect(() => {
    if (!isOpen || stepIndex >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[stepIndex];
    const updatePosition = () => {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setCoords(null);
      }
    };

    // Delay slightly to let route animations complete, checking at multiple intervals
    const timer1 = setTimeout(updatePosition, 100);
    const timer2 = setTimeout(updatePosition, 400);
    const timer3 = setTimeout(updatePosition, 800);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [stepIndex, isOpen, location.pathname]);

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsOpen(false);
    localStorage.setItem('real_estate_crm_tour_completed', 'true');
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[stepIndex];

  const getTooltipStyle = () => {
    if (!coords) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed', zIndex: 101 };
    
    const margin = 16;
    const tooltipWidth = 320;
    
    let top = coords.top + coords.height + margin;
    let left = coords.left + coords.width / 2 - tooltipWidth / 2;

    // Position overrides
    if (currentStep.placement === 'right') {
      top = coords.top + coords.height / 2 - 80;
      left = coords.left + coords.width + margin;
    } else if (currentStep.placement === 'left') {
      top = coords.top + coords.height / 2 - 80;
      left = coords.left - tooltipWidth - margin;
    } else if (currentStep.placement === 'top') {
      top = coords.top - 180 - margin;
      left = coords.left + coords.width / 2 - tooltipWidth / 2;
    }

    // Window bounds checking
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (top < 16) top = 16;
    if (top + 180 > window.innerHeight - 16) {
      top = window.innerHeight - 180 - 16;
    }

    return {
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
      zIndex: 101,
      transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Morphing spotlight cutout backdrop */}
      {coords && (
        <div
          className="fixed border border-[var(--accent)] rounded-2xl pointer-events-none z-[99]"
          style={{
            top: coords.top - 6,
            left: coords.left - 6,
            width: coords.width + 12,
            height: coords.height + 12,
            boxShadow: '0 0 0 9999px rgba(12, 9, 7, 0.55), 0 0 15px rgba(196, 101, 74, 0.45)',
            transition: 'all 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
            pointerEvents: 'auto'
          }}
        />
      )}

      {/* Floating Card Tip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22 }}
          className="card-no-hover pointer-events-auto"
          style={{
            ...getTooltipStyle(),
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'var(--blur-md)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-float)',
            padding: '18px 20px',
            borderRadius: '16px'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-accent font-display">
              <Sparkles size={13} className="animate-spin-slow" />
              <span>AURION TOUR ({stepIndex + 1}/{TOUR_STEPS.length})</span>
            </span>
            <button
              onClick={handleSkip}
              className="p-1 rounded-lg hover:bg-[var(--accent-light)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              title="Skip Tour"
            >
              <X size={14} />
            </button>
          </div>

          {/* Title & Content */}
          <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {currentStep.title}
          </h3>
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            {currentStep.content}
          </p>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={handleSkip}
              className="text-xs font-semibold hover:text-[var(--accent)] transition-colors text-[var(--text-muted)]"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="btn btn-secondary btn-sm p-1.5 rounded-lg flex items-center justify-center"
                  title="Previous Step"
                >
                  <ChevronLeft size={13} />
                </button>
              )}
              <button
                onClick={handleNext}
                className="btn btn-primary btn-sm px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <span>{stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
