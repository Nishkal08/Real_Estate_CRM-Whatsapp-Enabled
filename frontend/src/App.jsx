import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useDarkMode } from '@/hooks/useDarkMode';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';

// Pages — protected
import Dashboard from '@/pages/Dashboard';
import Leads from '@/pages/Leads';
import Campaigns from '@/pages/Campaigns';
import Conversations from '@/pages/Conversations';
import ConversationDetail from '@/pages/ConversationDetail';
import ContentStudio from '@/pages/ContentStudio';
import KnowledgeBase from '@/pages/KnowledgeBase';
import BookingAgent from '@/pages/BookingAgent';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import AITester from '@/pages/AITester';

// Pages — public
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Onboarding from '@/pages/Onboarding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
});

/**
 * Protected route wrapper
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Root App with dark mode init
 */
function AppRoot() {
  const { theme } = useUIStore();

  // Apply theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="conversations/:leadId" element={<ConversationDetail />} />
        <Route path="content-studio" element={<ContentStudio />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="booking" element={<BookingAgent />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="ai-tester" element={<AITester />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoot />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
