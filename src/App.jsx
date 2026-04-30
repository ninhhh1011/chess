import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Play from './pages/Play';
import Exercises from './pages/Exercises';
import Training from './pages/Training';
import Openings from './pages/Openings';
import OpeningDetail from './pages/OpeningDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { AuthProvider } from './contexts/AuthContext';
import { getUserProfile } from './services/userProfileService';

export default function App() {
  useEffect(() => {
    getUserProfile();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/play" element={<Play />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/training" element={<Training />} />
            <Route path="/openings" element={<Openings />} />
            <Route path="/openings/:openingId" element={<OpeningDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
