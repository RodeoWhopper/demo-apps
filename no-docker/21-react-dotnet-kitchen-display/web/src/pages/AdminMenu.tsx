import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";
import { errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money } from "../lib/format";
import { useHubEvent } from "../lib/hub";
import type { MenuItem } from "../lib/types";

interface FormState {
  name: string;
  category: string;
  price: string;
  isAvailable: boolean;
}
const EMPTY: FormState = { name: "", category: "", price: "", isAvailable: true };

export default function AdminMenu() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await authFetch<MenuItem[]>("/api/menu/admin"));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);
  useHubEvent("menuChanged", () => void load());

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category))], [items]);

  const startEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, price: String(item.price), isAvailable: item.isAvailable });
  };
  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { name: form.name, category: form.category, price: Number(form.price), isAvailable: form.isAvailable };
    try {
      if (editing) await authFetch<MenuItem>(`/api/menu/admin/${editing.id}`, { method: "PUT", json: payload });
      else await authFetch<MenuItem>("/api/menu/admin", { json: payload });
      cancelEdit();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: MenuItem) => {
    setError(null);
    try {
      await authFetch<MenuItem>(`/api/menu/admin/${item.id}`, { method: "PUT", json: { ...item, isAvailable: !item.isAvailable } });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (item: MenuItem) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setError(null);
    try {
      await authFetch<void>(`/api/menu/admin/${item.id}`, { method: "DELETE" });
      if (editing?.id === item.id) cancelEdit();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (items === null && !error) return <Spinner label="Loading menu…" />;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-2xl font-black">Menu</h1>
        <p className="text-sm text-zinc-400">Changes are pushed to every open order page instantly (menuChanged).</p>
        <div className="mt-4">
          <ErrorBanner messages={error} onDismiss={() => setError(null)} />
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-head bg-coal-900">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2">Available</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-coal-700">
              {(items ?? []).map((item) => (
                <tr key={item.id} className={editing?.id === item.id ? "bg-ember-500/5" : ""}>
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.category}</td>
                  <td className="px-4 py-2 text-right font-mono">{money(item.price)}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.isAvailable}
                      onClick={() => void toggle(item)}
                      className={`relative h-6 w-11 rounded-full transition ${item.isAvailable ? "bg-emerald-500" : "bg-coal-600"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${item.isAvailable ? "left-5.5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => startEdit(item)}>
                      Edit
                    </button>{" "}
                    <button type="button" className="btn btn-danger px-2 py-1 text-xs" onClick={() => void remove(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={(e) => void submit(e)} className="card h-fit space-y-3 p-4 lg:sticky lg:top-16">
        <h2 className="text-lg font-bold">{editing ? `Edit #${editing.id}` : "New item"}</h2>
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <input id="category" className="input" required maxLength={40} list="categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="price">
            Price (₺)
          </label>
          <input id="price" className="input" type="number" min="0.01" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
          Available for ordering
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
            {editing ? "Save" : "Add item"}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
