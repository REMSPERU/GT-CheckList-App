import { useEffect, useState } from 'react';

import { fetchWithAuth } from '@/services/auth/auth.service';
import type { AlexpertoRequestDocument } from '@/types/alexperto';

function preferredDocumentId(documents: AlexpertoRequestDocument[]) {
  return (
    documents.find(
      document =>
        document.typeName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase() === 'informes tecnicos',
    )?.id ??
    documents[0]?.id ??
    null
  );
}

export function useRequestDocuments(requestId: string | null) {
  const [documents, setDocuments] = useState<AlexpertoRequestDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    const currentRequestId = requestId;
    let cancelled = false;
    setDocuments([]);
    setSelectedDocumentId(null);
    setDocumentUrl(null);

    async function loadDocuments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/solicitudes/${currentRequestId}/documentos`,
        );
        if (!response.ok)
          throw new Error('No se pudieron cargar los documentos.');
        const payload = (await response.json()) as {
          items: AlexpertoRequestDocument[];
        };
        if (cancelled) return;
        setDocuments(payload.items);
        setSelectedDocumentId(preferredDocumentId(payload.items));
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
  }, [requestId]);

  useEffect(() => {
    if (!requestId || !selectedDocumentId) {
      setDocumentUrl(null);
      return;
    }
    let cancelled = false;

    async function loadDocumentUrl() {
      setIsLoadingDocument(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/solicitudes/${requestId}/documentos/${selectedDocumentId}`,
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
  }, [requestId, selectedDocumentId]);

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
