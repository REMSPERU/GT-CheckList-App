import { useEffect, useState } from 'react';

import { fetchWithAuth } from '@/services/auth/auth.service';
import type { TechnicalReportSummaryResponse } from '@/types/alexperto';

function endpoint(requestId: string, documentId: string) {
  return `/api/alexperto/solicitudes/${requestId}/documentos/${documentId}/resumen-tecnico`;
}

export function useTechnicalReportSummary(
  requestId: string | null,
  documentId: string | null,
  enabled: boolean,
) {
  const [result, setResult] = useState<TechnicalReportSummaryResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId || !documentId || !enabled) {
      setResult(null);
      setError(null);
      return;
    }
    const currentRequestId = requestId;
    const currentDocumentId = documentId;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(
          endpoint(currentRequestId, currentDocumentId),
        );
        if (!response.ok) throw new Error('No se pudo cargar el resumen IA.');
        const payload =
          (await response.json()) as TechnicalReportSummaryResponse;
        if (!cancelled) setResult(payload);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el resumen IA.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId, enabled, requestId]);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(seconds => seconds + 1);
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating || !requestId || !documentId) return;
    let cancelled = false;
    const currentRequestId = requestId;
    const currentDocumentId = documentId;
    async function refreshProgress() {
      try {
        const response = await fetchWithAuth(
          endpoint(currentRequestId, currentDocumentId),
        );
        if (!response.ok) return;
        const payload =
          (await response.json()) as TechnicalReportSummaryResponse;
        if (!cancelled) setResult(payload);
      } catch {
        // El POST en curso conserva el error definitivo para el usuario.
      }
    }
    void refreshProgress();
    const interval = window.setInterval(() => void refreshProgress(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [documentId, isGenerating, requestId]);

  async function generate(regenerate = false) {
    if (!requestId || !documentId) return;
    const currentRequestId = requestId;
    const currentDocumentId = documentId;
    setIsGenerating(true);
    setElapsedSeconds(0);
    setError(null);
    try {
      const response = await fetchWithAuth(
        endpoint(currentRequestId, currentDocumentId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regenerate }),
        },
      );
      const payload =
        (await response.json()) as TechnicalReportSummaryResponse & {
          message?: string;
        };
      if (!response.ok)
        throw new Error(payload.message ?? 'No se pudo analizar el informe.');
      setResult(payload);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'No se pudo analizar el informe.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    result,
    isLoading,
    isGenerating,
    elapsedSeconds,
    error,
    generate,
  };
}
