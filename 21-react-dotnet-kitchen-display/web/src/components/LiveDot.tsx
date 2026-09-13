import { useHub } from "../lib/hub";

const LABELS = {
  connecting: { text: "Connecting", cls: "bg-zinc-500" },
  connected: { text: "Live", cls: "bg-emerald-400" },
  reconnecting: { text: "Reconnecting", cls: "bg-ember-400 animate-pulse" },
  disconnected: { text: "Offline", cls: "bg-rose-500" },
} as const;

/** SignalR connection indicator shown in the header of every page. */
export default function LiveDot() {
  const { status } = useHub();
  const meta = LABELS[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-400" title={`Realtime: ${meta.text}`}>
      <span className={`h-2 w-2 rounded-full ${meta.cls}`} />
      {meta.text}
    </span>
  );
}
