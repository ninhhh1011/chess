import { useEffect, useRef, useState } from 'react';
import { analyzeFen, cancelPendingAnalysis } from '../services/stockfishService';

export function useEngineAnalysis({ fen, enabled = true, depth = 8, movetime = 650 }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !fen) {
      setAnalysis(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsAnalyzing(true);
    setError(null);

    const timerId = window.setTimeout(() => {
      analyzeFen({ fen, depth, movetime })
        .then((result) => {
          if (requestIdRef.current !== requestId) return;
          setAnalysis(result);
          setIsAnalyzing(false);
        })
        .catch((err) => {
          if (requestIdRef.current !== requestId) return;
          setError(err.message || 'Analysis failed');
          setIsAnalyzing(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(timerId);
      cancelPendingAnalysis();
    };
  }, [fen, enabled, depth, movetime]);

  function runAnalysis() {
    if (!fen) return Promise.reject(new Error('No FEN provided'));

    setIsAnalyzing(true);
    setError(null);

    return analyzeFen({ fen, depth, movetime })
      .then((result) => {
        setAnalysis(result);
        setIsAnalyzing(false);
        return result;
      })
      .catch((err) => {
        setError(err.message || 'Analysis failed');
        setIsAnalyzing(false);
        throw err;
      });
  }

  return {
    analysis,
    isAnalyzing,
    error,
    runAnalysis,
  };
}
