import { useState, useEffect } from 'react';
import { loadSeoWeights, invalidateSeoWeightsCache } from '@/lib/seoScoring';

export function useSeoWeights() {
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [baseScore, setBaseScore] = useState(45);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeoWeights().then(({ weights, baseScore }) => {
      setWeights(weights);
      setBaseScore(baseScore);
      setLoading(false);
    });
  }, []);

  const refresh = () => {
    invalidateSeoWeightsCache();
    setLoading(true);
    loadSeoWeights().then(({ weights, baseScore }) => {
      setWeights(weights);
      setBaseScore(baseScore);
      setLoading(false);
    });
  };

  return { weights, baseScore, loading, refresh };
}
