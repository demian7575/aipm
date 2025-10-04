import { useEffect, useState } from 'react';
import { mockMindmap } from '../data/mockMindmap';
import { MindmapSnapshot } from '../types/mindmap';

interface MindmapState {
  snapshot: MindmapSnapshot;
  isLoading: boolean;
  error: string | null;
}

export function useMindmapSnapshot(): MindmapState {
  const [snapshot, setSnapshot] = useState<MindmapSnapshot>(mockMindmap);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSnapshot() {
      try {
        const response = await fetch('/api/mindmap', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }
        const payload = (await response.json()) as MindmapSnapshot;
        setSnapshot(payload);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Falling back to local mock data. Start the mock API to enable live updates.');
          setSnapshot(mockMindmap);
        }
      } finally {
        setLoading(false);
      }
    }

    loadSnapshot();

    return () => controller.abort();
  }, []);

  return { snapshot, isLoading, error };
}
