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

function MainScreen() {
  return (
    <div className="main-screen">
      <Header />
      <TopStyles />
      <DiscoverStyles />
      <Gallery />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {(import.meta.env.VITE_ENABLE_CMS === 'true' || import.meta.env.DEV) && (
          <Route path="/keystatic/*" element={<Admin />} />
        )}
        <Route path="/" element={<MainScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
