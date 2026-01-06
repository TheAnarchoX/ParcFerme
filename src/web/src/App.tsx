import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthInitializer } from './hooks/useAuth';
import { ProtectedRoute, GuestOnlyRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { StatusPage } from './pages/StatusPage';

function AppRoutes() {
  const isInitialized = useAuthInitializer();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
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
      {/* <Route path="/log" element={<ProtectedRoute><LogRacePage /></ProtectedRoute>} /> */}
      
      {/* PaddockPass-only routes */}
      {/* <Route path="/stats/advanced" element={<ProtectedRoute requirePaddockPass><AdvancedStatsPage /></ProtectedRoute>} /> */}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
