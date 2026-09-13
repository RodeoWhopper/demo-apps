import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next);
  const session = await getSession();
  if (session) redirect(target);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in to your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Session is a signed JWT stored in an httpOnly cookie.</p>
          <div className="mt-6">
            <LoginForm next={target} />
          </div>
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Demo accounts</p>
            <p className="mt-1"><code>admin@lumeo.dev</code> / <code>Admin123!</code> (admin)</p>
            <p><code>user@lumeo.dev</code> / <code>User123!</code> (member)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
