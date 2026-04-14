import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Shelf from './pages/Shelf';
import OAuthCallback from './pages/OAuthCallback';
import ActivityDayDetails from './pages/ActivityDayDetails';
import MediaDetailsPage from './pages/MediaDetails';
import Profile from './pages/Profile';

const ConnectivityBanner: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
      You are offline. Shelf will keep showing cached pages until your connection is back.
    </div>
  );
};

const OAuthQueryHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const username = searchParams.get('username');
    const email = searchParams.get('email');
    const bio = searchParams.get('bio');
    const avatarUrl = searchParams.get('avatarUrl');
    const oauthError = searchParams.get('oauth_error');

    if (token && username && email) {
      login(token, { username, email, bio, avatarUrl });
      navigate('/', { replace: true });
      return;
    }

    if (oauthError) {
      navigate(`/login?oauth_error=${encodeURIComponent(oauthError)}`, { replace: true });
    }
  }, [location.search, login, navigate]);

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ConnectivityBanner />
        <OAuthQueryHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Shelf />
              </PrivateRoute>
            }
          />
          <Route
            path="/activity/:date"
            element={
              <PrivateRoute>
                <ActivityDayDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/media/:mediaId"
            element={
              <PrivateRoute>
                <MediaDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/u/:username"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
