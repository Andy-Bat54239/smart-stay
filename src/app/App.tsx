import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/context/LanguageContext';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { StoreProvider } from '@/data/store';
import { AIProvider } from '@/components/ai/AIContext';
import { CommandPalette } from '@/components/ai/CommandPalette';
import { CopilotPanel } from '@/components/ai/CopilotPanel';
import { BookingWizard } from '@/components/BookingWizard';
import { canSee, NAV } from '@/components/layout/nav';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ReservationsPage from '@/pages/ReservationsPage';
import RoomsPage from '@/pages/RoomsPage';
import RegisterPage from '@/pages/RegisterPage';
import GuestsPage from '@/pages/GuestsPage';
import HousekeepingPage from '@/pages/HousekeepingPage';
import BillingPage from '@/pages/BillingPage';
import ForecastingPage from '@/pages/ForecastingPage';
import ReportsPage from '@/pages/ReportsPage';
import AssistantPage from '@/pages/AssistantPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SecurityPage from '@/pages/SecurityPage';
import { useStore } from '@/data/store';

/** Mounts the global AI layer + booking wizard inside the router (they navigate). */
function Root() {
  const { theme } = useTheme();
  return (
    <AIProvider>
      <Outlet />
      <CommandPalette />
      <CopilotPanel />
      <BookingWizard />
      <Toaster theme={theme} position="bottom-center" richColors closeButton />
    </AIProvider>
  );
}

function RequireAuth() {
  const { session } = useSession();
  const { permissions } = useStore();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const item = NAV.find((n) => location.pathname.startsWith(n.to));
  if (item && !canSee(permissions, session.role, item)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      { path: '/', Component: LandingPage },
      { path: '/login', Component: LoginPage },
      { path: '/register', Component: RegisterPage },
      {
        Component: RequireAuth,
        children: [
          { path: '/dashboard', Component: DashboardPage },
          { path: '/reservations', Component: ReservationsPage },
          { path: '/rooms', Component: RoomsPage },
          { path: '/guests', Component: GuestsPage },
          { path: '/housekeeping', Component: HousekeepingPage },
          { path: '/billing', Component: BillingPage },
          { path: '/forecasting', Component: ForecastingPage },
          { path: '/reports', Component: ReportsPage },
          { path: '/assistant', Component: AssistantPage },
          { path: '/notifications', Component: NotificationsPage },
          { path: '/security', Component: SecurityPage },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <SessionProvider>
          <StoreProvider>
            <Tooltip.Provider>
              <RouterProvider router={router} />
            </Tooltip.Provider>
          </StoreProvider>
        </SessionProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
