import { useCallback, useEffect, useRef, useState } from "react";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";
import { errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { clock, isActive, minutesSince, money, STATUS_META, useNow } from "../lib/format";
import { useHub, useHubEvent } from "../lib/hub";
import type { Order, OrderStatus, Stats } from "../lib/types";

const COLUMNS: OrderStatus[] = ["Received", "Preparing", "Ready"];
const byCreated = (a: Order, b: Order) => a.createdAt.localeCompare(b.createdAt);

/** Staff queue: big touch targets, one column per active status, live through the hub. */
export default function Kitchen() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const statsTimer = useRef<number | undefined>(undefined);
  const now = useNow(10_000);
  const { status: hubStatus } = useHub();

  const loadStats = useCallback(async () => {
    try {
      setStats(await authFetch<Stats>("/api/stats"));
    } catch {
      /* stats are decorative; errors surface through the main load */
    }
  }, [authFetch]);

  const load = useCallback(async () => {
    try {
      const list = await authFetch<Order[]>("/api/orders");
      setOrders(list.filter((o) => isActive(o.status)).sort(byCreated));
      setError(null);
      void loadStats();
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [authFetch, loadStats]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (hubStatus === "connected") void load();
  }, [hubStatus, load]);

  const upsert = useCallback(
    (o: Order) => {
      setOrders((prev) => {
        const rest = (prev ?? []).filter((x) => x.id !== o.id);
        return isActive(o.status) ? [...rest, o].sort(byCreated) : rest;
      });
      window.clearTimeout(statsTimer.current);
      statsTimer.current = window.setTimeout(() => void loadStats(), 500);
    },
    [loadStats],
  );
  useHubEvent<Order>("orderCreated", upsert);
  useHubEvent<Order>("orderUpdated", upsert);

  const transition = async (o: Order, status: OrderStatus) => {
    setBusyId(o.id);
    setError(null);
    try {
      upsert(await authFetch<Order>(`/api/orders/${o.id}/status`, { method: "PATCH", json: { status } }));
    } catch (e) {
      setError(errorMessage(e));
      void load(); // resync after a 409 (someone else moved it first)
    } finally {
      setBusyId(null);
    }
  };

  if (orders === null && !error) return <Spinner label="Loading queue…" />;

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black tracking-tight">Kitchen queue</h1>
        {stats && (
          <div className="ml-auto flex flex-wrap gap-2 text-sm">
            <Stat label="Active" value={stats.activeOrders} />
            <Stat label="Served today" value={stats.today.served ?? 0} />
            <Stat label="Avg prep" value={stats.avgPrepMinutes === null ? "–" : `${stats.avgPrepMinutes} min`} />
            <Stat label="Revenue" value={money(stats.revenueToday)} />
          </div>
        )}
      </div>

      <ErrorBanner messages={error} onDismiss={() => setError(null)} />

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((status) => {
          const meta = STATUS_META[status];
          const items = (orders ?? []).filter((o) => o.status === status);
          return (
            <section key={status} className={`card border-t-4 ${meta.column} min-h-[60vh] p-3`}>
              <header className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </h2>
                <span className="rounded-full bg-coal-700 px-2.5 py-0.5 font-mono text-sm text-zinc-300">{items.length}</span>
              </header>
              <ul className="space-y-3">
                {items.map((o) => {
                  const age = minutesSince(o.createdAt, now);
                  const busy = busyId === o.id;
                  return (
                    <li key={o.id} className="rounded-xl bg-coal-900 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-3xl leading-none font-black">{o.tableCode}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            #{o.id} · {clock(o.createdAt)}
                          </p>
                        </div>
                        <p className={`font-mono text-2xl font-bold ${age >= 15 ? "text-rose-400" : age >= 8 ? "text-ember-300" : "text-zinc-300"}`}>
                          {age}
                          <span className="text-sm font-medium"> min</span>
                        </p>
                      </div>
                      <ul className="mt-3 space-y-1 text-base">
                        {o.lines.map((l) => (
                          <li key={l.menuItemId}>
                            <span className="inline-block w-8 font-mono font-bold text-ember-300">{l.qty}×</span>
                            {l.name}
                          </li>
                        ))}
                      </ul>
                      {o.note && <p className="mt-3 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-200">{o.note}</p>}
                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        {status === "Received" && (
                          <button type="button" className="btn btn-primary btn-xl" disabled={busy} onClick={() => void transition(o, "Preparing")}>
                            Start preparing
                          </button>
                        )}
                        {status === "Preparing" && (
                          <button type="button" className="btn btn-success btn-xl" disabled={busy} onClick={() => void transition(o, "Ready")}>
                            Mark ready
                          </button>
                        )}
                        {status === "Ready" && (
                          <button type="button" className="btn btn-ghost btn-xl col-span-2" disabled={busy} onClick={() => void transition(o, "Served")}>
                            Served
                          </button>
                        )}
                        {status !== "Ready" && (
                          <button type="button" className="btn btn-danger btn-xl px-4" disabled={busy} onClick={() => void transition(o, "Cancelled")} aria-label="Cancel order">
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="py-10 text-center text-sm text-zinc-600">Nothing here</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-coal-800 px-3 py-1.5">
      <span className="text-zinc-500">{label} </span>
      <span className="font-mono font-bold text-zinc-100">{value}</span>
    </div>
  );
}
