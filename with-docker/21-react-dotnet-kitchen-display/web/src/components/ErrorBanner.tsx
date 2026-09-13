export default function ErrorBanner({ messages, onDismiss }: { messages: string[] | string | null; onDismiss?: () => void }) {
  if (!messages || messages.length === 0) return null;
  const list = Array.isArray(messages) ? messages : [messages];
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <ul className="flex-1 space-y-0.5">
        {list.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-rose-300 hover:text-white" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
