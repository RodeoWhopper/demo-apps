import { Link } from "react-router";

export default function Forbidden() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-orbit-500">403</p>
      <h1 className="mt-2 text-xl font-semibold text-white">Admins only</h1>
      <p className="mt-1 text-slate-400">Your account does not have the admin role required for this page.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-space-700 px-4 py-2 text-sm hover:bg-space-800">Back to the board</Link>
    </div>
  );
}
