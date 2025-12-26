import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TopStyles from './components/TopStyles';
import DiscoverStyles from './components/DiscoverStyles';
import Gallery from './components/Gallery';
import { Keystatic } from '@keystatic/core/ui';
import config from '../keystatic.config';

function Admin() {
  return <Keystatic config={config} />;
}

import Paywall from './components/Paywall';
import { useUser } from './context/UserContext';

function MainScreen() {
  const { isPaywallOpen, closePaywall } = useUser();
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
              <Route path="/keystatic/*" element={<Admin />} />
            )}
            <Route path="/" element={<MainScreen />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
