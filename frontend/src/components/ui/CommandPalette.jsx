import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, Users, Megaphone, MessageSquare,
  Sparkles, BookOpen, Calendar, BarChart3, Settings, Terminal,
  ArrowRight, X, Zap
} from 'lucide-react';

const COMMANDS = [
  { id: 'dashboard',      label: 'Dashboard',        icon: <LayoutDashboard size={14} />, route: '/dashboard',      group: 'Navigate' },
  { id: 'leads',          label: 'Leads',             icon: <Users size={14} />,           route: '/leads',          group: 'Navigate' },
  { id: 'campaigns',      label: 'Campaigns',         icon: <Megaphone size={14} />,       route: '/campaigns',      group: 'Navigate' },
  { id: 'conversations',  label: 'Conversations',     icon: <MessageSquare size={14} />,   route: '/conversations',  group: 'Navigate' },
  { id: 'content-studio', label: 'Content Studio',    icon: <Sparkles size={14} />,        route: '/content-studio', group: 'Navigate' },
  { id: 'booking',        label: 'Booking Agent',     icon: <Calendar size={14} />,        route: '/booking',        group: 'Navigate' },
  { id: 'analytics',      label: 'Analytics',         icon: <BarChart3 size={14} />,       route: '/analytics',      group: 'Navigate' },
  { id: 'knowledge-base', label: 'Knowledge Base',    icon: <BookOpen size={14} />,        route: '/knowledge-base', group: 'Navigate' },
  { id: 'ai-tester',      label: 'AI Sandbox',        icon: <Terminal size={14} />,        route: '/ai-tester',      group: 'Navigate' },
  { id: 'settings',       label: 'Settings',          icon: <Settings size={14} />,        route: '/settings',       group: 'Navigate' },
  { id: 'new-campaign',   label: 'New Campaign',      icon: <Megaphone size={14} />,       route: '/campaigns',      group: 'Actions'  },
  { id: 'tour',           label: 'Start Website Tour',icon: <Zap size={14} />,             action: 'tour',           group: 'Actions'  },
];

const kbdStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '1px 5px', borderRadius: 4, background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)', fontSize: 10,
  fontFamily: 'var(--font-body)', marginRight: 4,
};

export function CommandPalette({ open, onClose }) {
  const [query, setQuery]       = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const execute = useCallback((cmd) => {
    onClose();
    if (cmd.action === 'tour') {
      setTimeout(() => window.dispatchEvent(new CustomEvent('start-guided-tour')), 200);
    } else if (cmd.route) {
      navigate(cmd.route);
    }
  }, [navigate, onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flat.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (flat[activeIndex]) execute(flat[activeIndex]); }
      else if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, flat, activeIndex, execute, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(10, 7, 4, 0.55)',
              backdropFilter: 'blur(6px)', zIndex: 200,
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: '14%', left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: 560, zIndex: 201,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              borderRadius: 16, boxShadow: 'var(--shadow-float)', overflow: 'hidden',
            }}
          >
            {/* Search row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              borderBottom: '1px solid var(--border-glass)',
            }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Jump to page, search, or run actions…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 8px 10px' }}>
              {flat.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  No results for &ldquo;{query}&rdquo;
                </p>
              ) : (
                Object.entries(grouped).map(([group, cmds]) => (
                  <div key={group} style={{ marginBottom: 4 }}>
                    <p style={{
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '6px 8px 3px',
                    }}>{group}</p>
                    {cmds.map((cmd) => {
                      const globalIdx = flat.indexOf(cmd);
                      const isActive  = globalIdx === activeIndex;
                      return (
                        <button key={cmd.id}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => execute(cmd)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '8px 10px', borderRadius: 10,
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                            background: isActive ? 'var(--accent-light)' : 'transparent',
                            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                            transition: 'all 120ms',
                          }}>
                          <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                            {cmd.icon}
                          </span>
                          <span style={{ flex: 1 }}>{cmd.label}</span>
                          {isActive && <ArrowRight size={12} style={{ color: 'var(--accent)', opacity: 0.6 }} />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '7px 16px',
              borderTop: '1px solid var(--border-glass)', fontSize: 11, color: 'var(--text-muted)',
            }}>
              <span><kbd style={kbdStyle}>↑↓</kbd>Navigate</span>
              <span><kbd style={kbdStyle}>↵</kbd>Open</span>
              <span><kbd style={kbdStyle}>Esc</kbd>Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
