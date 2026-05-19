interface AuthSubmitButtonProps {
  isSubmitting: boolean;
  submittingLabel: string;
  children: string;
  disabled?: boolean;
}

export function AuthSubmitButton({
  isSubmitting,
  submittingLabel,
  children,
  disabled = false,
}: AuthSubmitButtonProps) {
  return (
    <button
      className="mt-2 h-12 rounded-2xl border-0 bg-emerald-900 px-4 font-black text-white shadow-[0_12px_28px_rgba(6,78,59,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      type="submit"
      disabled={disabled || isSubmitting}>
      {isSubmitting ? submittingLabel : children}
    </button>
  );
}
