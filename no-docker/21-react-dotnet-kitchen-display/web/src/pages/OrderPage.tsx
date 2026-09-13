import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StatusBadge";
import { ApiError, errorMessage, request } from "../lib/api";
import { clock, isActive, money } from "../lib/format";
import { useHubEvent } from "../lib/hub";
import type { MenuItem, Order, OrderStatus } from "../lib/types";

const STEPS: OrderStatus[] = ["Received", "Preparing", "Ready", "Served"];
const TABLE_RE = /^[A-Z0-9-]{1,12}$/;

function readStoredOrderId(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/** Customer flow: /order/:tableCode -> pick items -> place order -> follow it live. */
export default function OrderPage() {
  const { tableCode = "" } = useParams();
  const code = tableCode.toUpperCase();
  const storageKey = `kds.order.${code}`;

  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      setMenu(await request<MenuItem[]>("/api/menu"));
    } catch (e) {
      setErrors([errorMessage(e)]);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);
  useHubEvent("menuChanged", () => void loadMenu());

  // Resume tracking an order placed earlier from this device (id kept per table in sessionStorage).
  useEffect(() => {
    const id = readStoredOrderId(storageKey);
    if (!id) return;
    request<Order>(`/api/orders/${id}`)
      .then(setOrder)
      .catch(() => sessionStorage.removeItem(storageKey));
  }, [storageKey]);

  useHubEvent<Order>("orderUpdated", (o) => {
    if (order && o.id === order.id) setOrder(o);
  });

  // Polling fallback while the order is still in the kitchen (covers a dropped hub connection).
  useEffect(() => {
    if (!order || !isActive(order.status)) return;
    const id = window.setInterval(() => {
      request<Order>(`/api/orders/${order.id}`).then(setOrder).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [order]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menu ?? []) map.set(item.category, [...(map.get(item.category) ?? []), item]);
    return [...map.entries()];
  }, [menu]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ item: menu?.find((m) => m.id === Number(id)), qty }))
        .filter((l): l is { item: MenuItem; qty: number } => !!l.item && l.qty > 0),
    [cart, menu],
  );
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  const change = (id: number, delta: number) =>
    setCart((prev) => {
      const qty = Math.min(20, Math.max(0, (prev[id] ?? 0) + delta));
      const next = { ...prev };
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const place = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const created = await request<Order>("/api/orders", {
        json: { tableCode: code, note: note.trim() || null, lines: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })) },
      });
      setOrder(created);
      setCart({});
      setNote("");
      try {
        sessionStorage.setItem(storageKey, String(created.id));
      } catch {
        /* storage unavailable */
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setErrors(["Too many orders from this device. Please wait a minute and try again."]);
      else setErrors(e instanceof ApiError ? e.messages : [errorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setOrder(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  if (!TABLE_RE.test(code)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Unknown table</h1>
        <p className="mt-2 text-zinc-400">Table codes are 1–12 letters, digits or dashes, e.g. M1, B2, T7.</p>
        <Link to="/order/M1" className="btn btn-primary mt-6">
          Order for table M1
        </Link>
      </div>
    );
  }

  if (order) {
    const stepIndex = STEPS.indexOf(order.status);
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-zinc-400">Table {code}</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-black">
          Order #{order.id} <StatusBadge status={order.status} size="lg" />
        </h1>

        {order.status === "Cancelled" ? (
          <div className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
            This order was cancelled by the kitchen. Please ask the staff or place a new one.
          </div>
        ) : (
          <ol className="mt-6 grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              return (
                <li key={s} className="text-center">
                  <div className={`h-2 rounded-full ${done ? "bg-ember-500" : "bg-coal-700"} ${i === stepIndex && s !== "Served" ? "animate-pulse" : ""}`} />
                  <p className={`mt-2 text-xs font-semibold ${done ? "text-ember-300" : "text-zinc-500"}`}>{s}</p>
                </li>
              );
            })}
          </ol>
        )}

        <div className="card mt-6 divide-y divide-coal-700">
          {order.lines.map((l) => (
            <div key={l.menuItemId} className="flex items-center justify-between px-4 py-3">
              <span>
                <span className="font-mono text-ember-300">{l.qty}×</span> {l.name}
              </span>
              <span className="text-zinc-400">{money(l.qty * l.unitPrice)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 font-bold">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
        {order.note && (
          <p className="mt-3 text-sm text-zinc-400">
            Note: <span className="text-zinc-200">{order.note}</span>
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Placed {clock(order.createdAt)}
          {order.readyAt ? ` · ready ${clock(order.readyAt)}` : ""}
          {order.servedAt ? ` · served ${clock(order.servedAt)}` : ""} · this page updates automatically.
        </p>
        <button type="button" onClick={startOver} className="btn btn-ghost mt-8">
          Place another order
        </button>
      </div>
    );
  }

  if (menu === null) return <Spinner label="Loading menu…" />;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <div>
        <p className="text-sm text-zinc-400">Table {code}</p>
        <h1 className="mt-1 text-3xl font-black">What would you like?</h1>
        <div className="mt-6 space-y-8">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-ember-400 uppercase">{category}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => {
                  const qty = cart[item.id] ?? 0;
                  return (
                    <li key={item.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-zinc-400">{money(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-ghost h-10 w-10 p-0 text-lg" onClick={() => change(item.id, -1)} disabled={qty === 0} aria-label={`Remove ${item.name}`}>
                          −
                        </button>
                        <span className="w-6 text-center font-mono text-lg">{qty}</span>
                        <button type="button" className="btn btn-primary h-10 w-10 p-0 text-lg" onClick={() => change(item.id, 1)} aria-label={`Add ${item.name}`}>
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {grouped.length === 0 && <p className="text-zinc-500">The menu is empty right now.</p>}
        </div>
      </div>

      <aside className="card h-fit p-4 lg:sticky lg:top-16">
        <h2 className="text-lg font-bold">Your order</h2>
        {lines.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Add something from the menu.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {lines.map((l) => (
              <li key={l.item.id} className="flex justify-between">
                <span>
                  <span className="font-mono text-ember-300">{l.qty}×</span> {l.item.name}
                </span>
                <span className="text-zinc-400">{money(l.item.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}
        <label className="label mt-4" htmlFor="note">
          Note for the kitchen
        </label>
        <textarea id="note" className="input" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. no onions" />
        <div className="mt-4 flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
        <div className="mt-3">
          <ErrorBanner messages={errors} onDismiss={() => setErrors([])} />
        </div>
        <button type="button" className="btn btn-primary btn-xl mt-3 w-full" disabled={lines.length === 0 || busy} onClick={() => void place()}>
          {busy ? "Sending…" : "Place order"}
        </button>
      </aside>
    </div>
  );
}
