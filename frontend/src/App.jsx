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

import { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';

function MainScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500); // 3.5 seconds wait

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen visible={true} />;
  }

  return (
    <div className="main-screen">
      <Header />
      <TopStyles />
      <DiscoverStyles />
      <Gallery />
    </div>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {(import.meta.env.VITE_ENABLE_CMS === 'true' || import.meta.env.DEV) && (
            <Route path="/keystatic/*" element={<Admin />} />
          )}
          <Route path="/" element={<MainScreen />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
