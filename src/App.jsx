import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PageSkeleton from './components/PageSkeleton';
import ErrorBoundary from './components/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Learn = lazy(() => import('./pages/Learn'));
const Play = lazy(() => import('./pages/Play'));
const OnlinePlay = lazy(() => import('./pages/OnlinePlay'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Training = lazy(() => import('./pages/Training'));
const Openings = lazy(() => import('./pages/Openings'));
const OpeningDetail = lazy(() => import('./pages/OpeningDetail'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

import { AuthProvider } from './contexts/AuthContext';
import { ChessGameProvider } from './contexts/ChessGameContext';
import { getUserProfile } from './services/userProfileService';
import { disposeEngine } from './services/stockfishService';

export default function App() {
  useEffect(() => {
    getUserProfile();

    // Cleanup Stockfish worker on app unmount
    return () => {
      disposeEngine();
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ChessGameProvider>
          <ErrorBoundary>
            <Layout>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/play" element={<Play />} />
                <Route path="/play/online/:gameId" element={<OnlinePlay />} />
                <Route path="/exercises" element={<Exercises />} />
                <Route path="/training" element={<Training />} />
                <Route path="/openings" element={<Openings />} />
                <Route path="/openings/:openingId" element={<OpeningDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Routes>
            </Suspense>
          </Layout>
          </ErrorBoundary>
        </ChessGameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
