import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthInitializer } from './hooks/useAuth';
import { ProtectedRoute, GuestOnlyRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { StatusPage } from './pages/StatusPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorPage, ForbiddenPage, ServerErrorPage, MaintenancePage } from './pages/ErrorPage';

// Legal pages
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { AboutPage } from './pages/AboutPage';

// Discovery pages
import { SeriesListPage } from './pages/discovery/SeriesListPage';
import { SeriesDetailPage } from './pages/discovery/SeriesDetailPage';
import { SeasonsPage } from './pages/discovery/SeasonsPage';
import { SeasonDetailPage } from './pages/discovery/SeasonDetailPage';
import { RoundDetailPage } from './pages/discovery/RoundDetailPage';
import { SessionDetailPage } from './pages/discovery/SessionDetailPage';
import { SessionsPage } from './pages/discovery/SessionsPage';
import { DriversPage } from './pages/discovery/DriversPage';
import { DriverDetailPage } from './pages/discovery/DriverDetailPage';
import { TeamsPage } from './pages/discovery/TeamsPage';
import { TeamDetailPage } from './pages/discovery/TeamDetailPage';
import { CircuitsPage } from './pages/discovery/CircuitsPage';
import { CircuitDetailPage } from './pages/discovery/CircuitDetailPage';

// Settings page
import { SettingsPage } from './pages/SettingsPage';

function AppRoutes() {
  const isInitialized = useAuthInitializer();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pf-green" />
          <p className="text-neutral-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/status" element={<StatusPage />} />
      
      {/* Guest-only routes (redirect if logged in) */}
      <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
      <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
      
      {/* Protected routes (require authentication) */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* Legal routes */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Discovery routes - Series hierarchy */}
      <Route path="/series" element={<SeriesListPage />} />
      <Route path="/series/:seriesSlug" element={<SeriesDetailPage />} />
      <Route path="/series/:seriesSlug/:year" element={<SeasonDetailPage />} />
      <Route path="/series/:seriesSlug/:year/:roundSlug" element={<RoundDetailPage />} />
      <Route path="/series/:seriesSlug/:year/:roundSlug/session/:sessionId" element={<SessionDetailPage />} />
      
      {/* Discovery routes - Direct entity access */}
      <Route path="/seasons" element={<SeasonsPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/drivers" element={<DriversPage />} />
      <Route path="/drivers/:driverSlug" element={<DriverDetailPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/teams/:teamSlug" element={<TeamDetailPage />} />
      <Route path="/circuits" element={<CircuitsPage />} />
      <Route path="/circuits/:circuitSlug" element={<CircuitDetailPage />} />
      
      {/* Error pages */}
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="/server-error" element={<ServerErrorPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      
      {/* Catch-all 404 route - must be last */}
      <Route path="*" element={<NotFoundPage />} />
      
      {/* PaddockPass-only routes */}
      {/* <Route path="/stats/advanced" element={<ProtectedRoute requirePaddockPass><AdvancedStatsPage /></ProtectedRoute>} /> */}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen app-background">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
