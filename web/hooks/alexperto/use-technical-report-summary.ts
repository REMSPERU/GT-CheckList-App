import { useEffect, useRef, useState } from 'react';

import { fetchWithAuth } from '@/services/auth/auth.service';
import type { TechnicalReportSummaryResponse } from '@/types/alexperto';

function endpoint(requestId: string, documentId: string) {
  return `/api/alexperto/solicitudes/${requestId}/documentos/${documentId}/resumen-tecnico`;
}

function pollingDelay(elapsedMs: number) {
  if (elapsedMs < 30_000) return 5_000;
  if (elapsedMs < 120_000) return 10_000;
  if (elapsedMs < 300_000) return 20_000;
  return 30_000;
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
  const etag = useRef<string | null>(null);
  const isProcessing =
    result?.status === 'PROCESSING' || result?.status === 'QUEUED';

  useEffect(() => {
    if (!requestId || !documentId || !enabled) {
      setResult(null);
      setError(null);
      etag.current = null;
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
        etag.current = response.headers.get('etag');
        const payload =
          (await response.json()) as TechnicalReportSummaryResponse;
        if (!cancelled) setResult(payload);
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el resumen IA.',
          );
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
    if (!isProcessing) return;
    const interval = window.setInterval(
      () => setElapsedSeconds(seconds => seconds + 1),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing || !requestId || !documentId || !enabled) return;
    const currentRequestId = requestId;
    const currentDocumentId = documentId;
    let cancelled = false;
    let timer: number | null = null;
    const startedAt = Date.now();
    async function refreshProgress() {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetchWithAuth(
          endpoint(currentRequestId, currentDocumentId),
          {
            headers: etag.current
              ? { 'If-None-Match': etag.current }
              : undefined,
          },
        );
        if (response.status === 304) return;
        if (!response.ok) return;
        etag.current = response.headers.get('etag');
        const payload =
          (await response.json()) as TechnicalReportSummaryResponse;
        if (!cancelled) setResult(payload);
      } finally {
        if (!cancelled)
          timer = window.setTimeout(
            refreshProgress,
            pollingDelay(Date.now() - startedAt),
          );
      }
    }
    function resumeIfVisible() {
      if (document.visibilityState === 'visible') void refreshProgress();
    }
    timer = window.setTimeout(refreshProgress, pollingDelay(0));
    document.addEventListener('visibilitychange', resumeIfVisible);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resumeIfVisible);
    };
  }, [documentId, enabled, isProcessing, requestId]);

  async function generate(regenerate = false) {
    if (!requestId || !documentId || isGenerating || isProcessing) return;
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
      etag.current = null;
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
    isGenerating: isGenerating || isProcessing,
    elapsedSeconds,
    error,
    generate,
  };
}
