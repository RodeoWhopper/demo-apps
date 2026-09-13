import Link from "next/link";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-600/40">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 18l5-7 4 4 7-9" />
        </svg>
      </span>
      <span className={dark ? "text-white" : "text-slate-900"}>
        Lumeo<span className="text-violet-500"> Analytics</span>
      </span>
    </Link>
  );
}
