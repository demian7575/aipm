import { useCallback, useEffect, useState } from 'react';
import { mockMindmap } from '../data/mockMindmap';
import { MindmapSnapshot, ReferenceRepositoryConfig } from '../types/mindmap';

interface MindmapState {
  snapshot: MindmapSnapshot;
  isLoading: boolean;
  error: string | null;
  saveReferenceRepository: (config: ReferenceRepositoryConfig) => Promise<void>;
}

export function useMindmapSnapshot(): MindmapState {
  const [snapshot, setSnapshot] = useState<MindmapSnapshot>(mockMindmap);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const saveReferenceRepository = useCallback(async (config: ReferenceRepositoryConfig) => {
    setSnapshot((prev) => ({ ...prev, referenceRepository: config }));

    try {
      const response = await fetch('/api/mindmap/reference-repository', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const payload = (await response.json()) as { referenceRepository: ReferenceRepositoryConfig };
      setSnapshot((prev) => ({ ...prev, referenceRepository: payload.referenceRepository }));
      setError(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const warning = 'Reference repository stored locally. Start the mock API to persist changes.';
        setError((prev) => {
          if (!prev) {
            return warning;
          }
          return prev.includes(warning) ? prev : `${prev} ${warning}`;
        });
      }
    }
  }, []);

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

  return { snapshot, isLoading, error, saveReferenceRepository };
}
