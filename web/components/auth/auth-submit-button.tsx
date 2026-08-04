import { Button } from '@/components/ui/button';

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
    <Button
      type="submit"
      variant="primary"
      size="lg"
      isLoading={isSubmitting}
      disabled={disabled}
      className="mt-2 w-full shadow-md">
      {isSubmitting ? submittingLabel : children}
    </Button>
  );
}

