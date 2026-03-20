import { useState, useEffect } from 'react';
import { loadSeoWeights, loadClientSeoWeights, invalidateSeoWeightsCache } from '@/lib/seoScoring';

export function useSeoWeights(clientId?: string) {
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [baseScore, setBaseScore] = useState(45);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loader = clientId ? loadClientSeoWeights(clientId) : loadSeoWeights();
    loader.then(({ weights, baseScore }) => {
      setWeights(weights);
      setBaseScore(baseScore);
      setLoading(false);
    });
  }, [clientId]);

  const refresh = () => {
    invalidateSeoWeightsCache();
    setLoading(true);
    const loader = clientId ? loadClientSeoWeights(clientId) : loadSeoWeights();
    loader.then(({ weights, baseScore }) => {
      setWeights(weights);
      setBaseScore(baseScore);
      setLoading(false);
    });
  };

  return { weights, baseScore, loading, refresh };
}
