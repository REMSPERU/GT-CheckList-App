import { useEffect, useState } from 'react';

import { fetchWithAuth } from '@/services/auth/auth.service';
import type { AlexpertoQuoteDocument } from '@/types/alexperto';

const documentsCache = new Map<string, AlexpertoQuoteDocument[]>();

export function useQuoteDocuments(quoteId: string | null) {
  const [documents, setDocuments] = useState<AlexpertoQuoteDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    const currentQuoteId = quoteId;
    let cancelled = false;
    const cachedDocuments = documentsCache.get(currentQuoteId);
    setDocuments([]);
    setSelectedDocumentId(null);
    setDocumentUrl(null);
    if (cachedDocuments) {
      setDocuments(cachedDocuments);
      setSelectedDocumentId(cachedDocuments[0]?.id ?? null);
      return;
    }

    async function loadDocuments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones/${currentQuoteId}/documentos`,
        );
        if (!response.ok)
          throw new Error('No se pudieron cargar los documentos.');
        const payload = (await response.json()) as {
          items: AlexpertoQuoteDocument[];
        };
        if (cancelled) return;
        documentsCache.set(currentQuoteId, payload.items);
        setDocuments(payload.items);
        setSelectedDocumentId(payload.items[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar los documentos.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  useEffect(() => {
    if (!quoteId || !selectedDocumentId) {
      setDocumentUrl(null);
      return;
    }
    let cancelled = false;

    async function loadDocumentUrl() {
      setIsLoadingDocument(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones/${quoteId}/documentos/${selectedDocumentId}`,
        );
        if (!response.ok) throw new Error('No se pudo cargar la vista previa.');
        const payload = (await response.json()) as { url: string };
        if (!cancelled) setDocumentUrl(payload.url);
      } catch (loadError) {
        if (!cancelled) {
          setDocumentUrl(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la vista previa.',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingDocument(false);
      }
    }

    void loadDocumentUrl();
    return () => {
      cancelled = true;
    };
  }, [quoteId, selectedDocumentId]);

  return {
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    documentUrl,
    isLoading,
    isLoadingDocument,
    error,
  };
}
