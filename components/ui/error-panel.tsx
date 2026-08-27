/**
 * One error surface, used everywhere a fetch can fail, so failure looks the same
 * across the app. The message explains what went wrong; the button is the way
 * forward (constitution: errors give direction, not mood).
 */
export function ErrorPanel({
  title,
  message,
  onRetry,
  compact = false,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted">
        {title}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-medium text-accent hover:underline"
          >
            Retry
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-card border border-risk-priority-tint bg-risk-priority-tint p-6"
    >
      <p className="text-sm font-medium text-risk-priority-fg">{title}</p>
      {message ? <p className="mt-1 text-sm text-risk-priority-fg">{message}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
