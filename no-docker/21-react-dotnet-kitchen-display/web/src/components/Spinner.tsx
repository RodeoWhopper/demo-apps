export default function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-zinc-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-coal-600 border-t-ember-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
