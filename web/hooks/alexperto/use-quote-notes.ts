import { useEffect, useState } from 'react';

import { fetchWithAuth } from '@/services/auth/auth.service';
import type { AlexpertoQuoteNote } from '@/types/alexperto';

const notesCache = new Map<string, AlexpertoQuoteNote[]>();

export function useQuoteNotes(quoteId: string | null) {
  const [notes, setNotes] = useState<AlexpertoQuoteNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) {
      setNotes([]);
      return;
    }

    const cached = notesCache.get(quoteId);
    if (cached) {
      setNotes(cached);
      return;
    }

    let cancelled = false;
    async function loadNotes() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones/${quoteId}/notas`,
        );
        if (!response.ok) {
          throw new Error('No se pudieron cargar las notas de Alexperto.');
        }
        const payload = (await response.json()) as {
          notes: AlexpertoQuoteNote[];
        };
        if (cancelled) return;
        notesCache.set(quoteId, payload.notes);
        setNotes(payload.notes);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al cargar notas de Alexperto.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  return { notes, isLoading, error };
}
