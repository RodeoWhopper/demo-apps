export default function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-slate-400" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-orbit-500 border-t-transparent" />
      {label}...
    </div>
  );
}
