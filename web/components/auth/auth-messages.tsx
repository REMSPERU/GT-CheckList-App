import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthMessagesProps {
  errorMessage: string | null;
  message: string | null;
}

export function AuthMessages({ errorMessage, message }: AuthMessagesProps) {
  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-900 shadow-sm animate-modal-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="flex-1 leading-snug">{errorMessage}</div>
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm animate-modal-in">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div className="flex-1 leading-snug">{message}</div>
        </div>
      ) : null}
    </div>
  );
}
