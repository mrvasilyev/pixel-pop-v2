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
  const [lockState, setLockState] = React.useState(null); // 'access' | 'desktop' | null

  React.useEffect(() => {
    // 1. Access Control (Guest System)
    // Block if NOT Dev AND NOT Telegram Context
    const isDev = import.meta.env.DEV;
    const isTelegram = !!window.Telegram?.WebApp?.initData;

    if (!isDev && !isTelegram) {
      setLockState('access');
      return;
    }

    // 2. Desktop Lock (Responsiveness)
    const checkWidth = () => {
      // Allow tablets (up to ~850px)
      if (window.innerWidth > 850) {
        setLockState('desktop');
      } else {
        setLockState(prev => prev === 'access' ? 'access' : null);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  if (lockState) {
    return <LockScreen type={lockState} />;
  }

  return (
    <div className="main-screen">
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
