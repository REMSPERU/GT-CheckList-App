import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthSubmitButtonProps {
  isSubmitting: boolean;
  submittingLabel: string;
  children: ReactNode;
  disabled?: boolean;
}

export function AuthSubmitButton({
  isSubmitting,
  submittingLabel,
  children,
  disabled = false,
}: AuthSubmitButtonProps) {
  const isDisabled = disabled || isSubmitting;

  return (
    <button
      className="relative mt-2 flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 font-semibold text-white shadow-sm shadow-emerald-950/10 transition-all duration-150 hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
      type="submit"
      disabled={isDisabled}>
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span>{submittingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
