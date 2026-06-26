import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Megaphone, MessageSquare,
  Sparkles, BookOpen, Calendar, BarChart3, Settings,
  ChevronLeft, ChevronRight, Zap, LogOut, Terminal
} from 'lucide-react';
import useUIStore from '@/stores/uiStore';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/utils/cn';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { to: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    ],
  },
  {
    label: 'Modules',
    items: [
      { to: '/leads',          icon: <Users size={17} />,          label: 'Leads' },
      { to: '/campaigns',      icon: <Megaphone size={17} />,      label: 'Campaigns' },
      { to: '/conversations',  icon: <MessageSquare size={17} />,  label: 'Conversations' },
      { to: '/content-studio', icon: <Sparkles size={17} />,       label: 'Content Studio' },
      { to: '/booking',        icon: <Calendar size={17} />,        label: 'Booking Agent' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/analytics',      icon: <BarChart3 size={17} />,      label: 'Analytics' },
    ],
  },
  {
    label: 'Config',
    items: [
      { to: '/knowledge-base', icon: <BookOpen size={17} />,       label: 'Knowledge Base' },
      { to: '/ai-tester',      icon: <Terminal size={17} />,       label: 'AI Sandbox' },
      { to: '/settings',       icon: <Settings size={17} />,       label: 'Settings' },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const logout = useAuthStore(state => state.logout);
  const location = useLocation();

  return (
    <motion.aside
      className="sidebar"
      data-tour="sidebar"
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-1 mb-4 flex-shrink-0"
        style={{ height: 40, overflow: 'hidden' }}
      >
        {/* Icon mark */}
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(196,101,74,0.30)' }}
        >
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>

        {/* Wordmark — hidden when collapsed */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center overflow-hidden whitespace-nowrap"
            >
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Aurion
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Brand divider */}
      <div className="divider mb-4" style={{ opacity: 0.6, marginLeft: 4, marginRight: 4 }} />

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group label */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="nav-section-label"
                >
                  {group.label}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items */}
            {group.items.map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn('nav-item', isActive && 'active')}
                  title={sidebarCollapsed ? item.label : undefined}
                  data-tour={item.to === '/conversations' ? 'conversations-link' : undefined}
                >
                  <span className="nav-icon flex-shrink-0">{item.icon}</span>

                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout & Collapse */}
      <div className="flex-shrink-0 mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={logout}
          className="nav-item w-full text-danger hover:bg-danger-light"
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <span className="nav-icon flex-shrink-0"><LogOut size={17} /></span>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap overflow-hidden font-medium"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={toggleSidebar}
          className={cn(
            'btn-icon w-full flex items-center transition-all',
            sidebarCollapsed ? 'justify-center' : 'justify-end pr-1'
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </motion.aside>
  );
}
