import { useEffect, useState } from "react";
import type { OrderStatus } from "./types";

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const money = (value: number) => currency.format(value);

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const minutesSince = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));

/** A ticking timestamp so "12 min" labels stay fresh without refetching. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const ACTIVE_STATUSES: readonly OrderStatus[] = ["Received", "Preparing", "Ready"];
export const isActive = (s: OrderStatus) => ACTIVE_STATUSES.includes(s);

export const STATUS_META: Record<OrderStatus, { label: string; dot: string; chip: string; column: string }> = {
  Received: {
    label: "Received",
    dot: "bg-sky-400",
    chip: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
    column: "border-sky-500/40",
  },
  Preparing: {
    label: "Preparing",
    dot: "bg-ember-400",
    chip: "bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/30",
    column: "border-ember-500/40",
  },
  Ready: {
    label: "Ready",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    column: "border-emerald-500/40",
  },
  Served: {
    label: "Served",
    dot: "bg-zinc-400",
    chip: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/30",
    column: "border-zinc-500/40",
  },
  Cancelled: {
    label: "Cancelled",
    dot: "bg-rose-400",
    chip: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    column: "border-rose-500/40",
  },
};
