import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Play from './pages/Play';
import Exercises from './pages/Exercises';

export default function App() {
  return <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/play" element={<Play />} />
        <Route path="/exercises" element={<Exercises />} />
      </Routes>
    </Layout>
  </BrowserRouter>;
}
