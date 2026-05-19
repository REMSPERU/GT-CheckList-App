interface AuthMessagesProps {
  errorMessage: string | null;
  message: string | null;
}

export function AuthMessages({ errorMessage, message }: AuthMessagesProps) {
  return (
    <>
      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {message}
        </div>
      ) : null}
    </>
  );
}
