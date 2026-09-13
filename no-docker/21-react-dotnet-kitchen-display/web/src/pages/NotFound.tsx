import { Link, useLocation } from "react-router";

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-6xl font-black text-ember-500">404</p>
      <h1 className="mt-4 text-2xl font-bold">Nothing on this ticket</h1>
      <p className="mt-2 text-zinc-400">
        <code className="rounded bg-coal-800 px-1.5 py-0.5 text-zinc-200">{pathname}</code> is not a page of this app.
      </p>
      <Link to="/" className="btn btn-primary mt-6">
        Go to the board
      </Link>
    </div>
  );
}
