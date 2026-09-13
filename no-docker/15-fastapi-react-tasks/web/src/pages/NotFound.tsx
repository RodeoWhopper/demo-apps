import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-slate-600">404</p>
      <h1 className="mt-2 text-xl font-semibold text-white">Lost in orbit</h1>
      <Link to="/" className="mt-6 inline-block rounded-md bg-space-700 px-4 py-2 text-sm hover:bg-space-800">Back to the board</Link>
    </div>
  );
}
