import './components/MainScreen.css';
import Header from './components/Header';
import TopStyles from './components/TopStyles';
import DiscoverStyles from './components/DiscoverStyles';
import Gallery from './components/Gallery';

function App() {
  return (
    <div className="main-screen">
      <Header />
      <TopStyles />
      <DiscoverStyles />
      <Gallery />
    </div>
  );
}

export default App;
