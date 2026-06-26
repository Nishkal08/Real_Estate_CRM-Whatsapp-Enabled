import { cloneElement } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '@/components/ui/Toast';
import { GuidedTour } from '@/components/ui/GuidedTour';
import useUIStore from '@/stores/uiStore';
import { useSSE } from '@/hooks/useSSE';
import { useHotkeys } from '@/hooks/useHotkeys';

/**
 * Root layout shell — both sidebar and topbar float as cards
 *
 * Sidebar: fixed, left: 12px, top: 12px, bottom: 12px  → width 220px (or 56px)
 * Content column starts after sidebar + gap
 */
export function AppShell() {
  const { sidebarCollapsed } = useUIStore();
  const location = useLocation();
  const outlet = useOutlet();

  useSSE();
  useHotkeys();

  // 12px sidebar offset + sidebar width + 12px gap to content
  const sidebarWidth   = sidebarCollapsed ? 56 : 220;
  const contentOffset  = 12 + sidebarWidth + 12; // = 244 | 80

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Floating sidebar */}
      <Sidebar />

      {/* Content column */}
      <div
        style={{
          marginLeft: contentOffset,
          transition: 'margin-left 280ms cubic-bezier(0.22,1,0.36,1)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          paddingRight: 16,   /* right breathing room */
        }}
      >
        {/* Floating pill topbar */}
        <Topbar />

        {/* Page content — offset for fixed topbar (56px capsule + 12px top + 12px gap = 80px) */}
        <main
          id="main-content"
          style={{ flex: 1, padding: '80px 0 48px' }}
        >
          <AnimatePresence mode="wait">
            {outlet && cloneElement(outlet, { key: location.pathname })}
          </AnimatePresence>
        </main>
      </div>

      <ToastContainer />
      <GuidedTour />
    </div>
  );
}
