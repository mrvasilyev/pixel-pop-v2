import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TopStyles from './components/TopStyles';
import DiscoverStyles from './components/DiscoverStyles';
import Gallery from './components/Gallery';

// Lazy load Admin to save ~2MB bundle size for users
const Admin = React.lazy(() => import('./Admin'));

import Paywall from './components/Paywall';
import { useUser } from './context/UserContext';
import LockScreen from './components/LockScreen';

function MainScreen() {
  const { isPaywallOpen, closePaywall } = useUser();

  // Synchronous Element Check to prevent "Flash of Main Screen"
  const [lockState, setLockState] = React.useState(() => {
    // 1. Access Control (Guest System)
    const isDev = import.meta.env.DEV;
    // Check both initData presence AND platform for robustness, though initData is the key
    const isTelegram = !!window.Telegram?.WebApp?.initData;

    if (!isDev && !isTelegram) {
      return 'access';
    }

    // 2. Desktop Lock (Initial Check)
    if (window.innerWidth > 850) {
      return 'desktop';
    }

    return null;
  });

  React.useEffect(() => {
    // Only need effect for RESIZE listener now
    const checkWidth = () => {
      // If we are already locked by 'access', do not override with 'desktop' checks
      // (The state update function pattern handles this safe-guarding)
      setLockState(prev => {
        if (prev === 'access') return 'access';

        if (window.innerWidth > 850) {
          return 'desktop';
        }
        return null;
      });
    };

    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  if (lockState) {
    return <LockScreen type={lockState} />;
  }

  const platform = window.Telegram?.WebApp?.platform || 'unknown';

  return (
    <div className="main-screen" data-platform={platform}>
      <Header />
      <TopStyles />
      <DiscoverStyles />
      <Gallery />
      <Paywall isOpen={isPaywallOpen} onClose={closePaywall} />
    </div>
  );
}

import { UserProvider } from './context/UserContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            {(import.meta.env.VITE_ENABLE_CMS === 'true' || import.meta.env.DEV) && (
              <Route
                path="/keystatic/*"
                element={
                  <Suspense fallback={<div>Loading CMS...</div>}>
                    <Admin />
                  </Suspense>
                }
              />
            )}
            <Route path="/" element={<MainScreen />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
