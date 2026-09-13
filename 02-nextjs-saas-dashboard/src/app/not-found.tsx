import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-6xl font-semibold text-violet-600">404</p>
        <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
        <Link href="/" className="mt-6 inline-block rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500">
          Go home
        </Link>
      </div>
    </div>
  );
}
