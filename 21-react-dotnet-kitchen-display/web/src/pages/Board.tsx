import { useCallback, useEffect, useState } from "react";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";
import { errorMessage, request } from "../lib/api";
import { clock, minutesSince, STATUS_META, useNow } from "../lib/format";
import { useHub, useHubEvent } from "../lib/hub";
import type { BoardOrder, BoardSnapshot, Order, OrderStatus } from "../lib/types";

const COLUMNS: OrderStatus[] = ["Received", "Preparing", "Ready", "Served"];

function toBoardOrder(o: Order): BoardOrder {
  return {
    id: o.id,
    tableCode: o.tableCode,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    itemCount: o.lines.reduce((sum, l) => sum + l.qty, 0),
  };
}

/** Public big-screen board: no auth, no personal data, live through the SignalR hub. */
export default function Board() {
  const [orders, setOrders] = useState<BoardOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(10_000);
  const { status: hubStatus } = useHub();

  const load = useCallback(async () => {
    try {
      const snapshot = await request<BoardSnapshot>("/api/board");
      setOrders(snapshot.orders);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  // After a (re)connect, reload so nothing missed while offline stays stale.
  useEffect(() => {
    if (hubStatus === "connected") void load();
  }, [hubStatus, load]);

  const upsert = useCallback((incoming: Order) => {
    const next = toBoardOrder(incoming);
    setOrders((prev) => {
      const list = prev ?? [];
      const i = list.findIndex((o) => o.id === next.id);
      if (i === -1) return [...list, next];
      const copy = list.slice();
      copy[i] = next;
      return copy;
    });
  }, []);
  useHubEvent<Order>("orderCreated", upsert);
  useHubEvent<Order>("orderUpdated", upsert);

  if (orders === null && !error) return <Spinner label="Loading board…" />;

  const cancelled = orders?.filter((o) => o.status === "Cancelled").length ?? 0;

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Salon board</h1>
          <p className="text-sm text-zinc-400">
            Orders update live · {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          {orders?.length ?? 0} orders today{cancelled > 0 ? ` · ${cancelled} cancelled` : ""}
        </p>
      </div>

      <ErrorBanner messages={error} onDismiss={() => setError(null)} />

      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((status) => {
          const meta = STATUS_META[status];
          const items = (orders ?? [])
            .filter((o) => o.status === status)
            .sort((a, b) =>
              status === "Served" ? b.updatedAt.localeCompare(a.updatedAt) : a.createdAt.localeCompare(b.createdAt),
            )
            .slice(0, status === "Served" ? 8 : undefined);
          return (
            <section key={status} className={`card border-t-4 ${meta.column} min-h-[60vh] p-3`}>
              <header className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </h2>
                <span className="rounded-full bg-coal-700 px-2.5 py-0.5 font-mono text-sm text-zinc-300">{items.length}</span>
              </header>
              <ul className="space-y-2">
                {items.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-center justify-between rounded-lg bg-coal-900 px-4 py-3 ${
                      status === "Ready" ? "ring-2 ring-emerald-500/60" : ""
                    }`}
                  >
                    <div>
                      <p className="text-4xl leading-none font-black tracking-tight">{o.tableCode}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        #{o.id} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {clock(o.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-2xl font-bold ${status === "Served" ? "text-zinc-500" : "text-ember-300"}`}>
                        {minutesSince(status === "Served" ? o.updatedAt : o.createdAt, now)}
                        <span className="text-sm font-medium"> min</span>
                      </p>
                      <p className="text-xs text-zinc-500">{status === "Served" ? "ago" : "waiting"}</p>
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="py-10 text-center text-sm text-zinc-600">—</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
