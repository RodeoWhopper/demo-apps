import type { User } from "../auth.ts";

const css = `
:root{--bg:#0b0f1a;--panel:#131a2b;--panel-2:#1b2439;--line:#26304a;--text:#e6e9f2;--muted:#8b94ad;--accent:#7c5cff;--accent-2:#2dd4bf;--danger:#ff5c7a;--radius:14px}
*{box-sizing:border-box}html{color-scheme:dark}
body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a1440 0%,var(--bg) 55%);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;min-height:100vh}
a{color:var(--accent-2);text-decoration:none}a:hover{text-decoration:underline}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid var(--line);backdrop-filter:blur(6px)}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.3px;color:var(--text);font-size:18px}
.brand .dot{width:12px;height:12px;border-radius:50%;background:var(--accent-2);box-shadow:0 0 0 6px rgba(45,212,191,.15);animation:pulse 2s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(45,212,191,.35)}70%{box-shadow:0 0 0 10px rgba(45,212,191,0)}100%{box-shadow:0 0 0 0 rgba(45,212,191,0)}}
nav{display:flex;gap:18px;align-items:center;font-size:14px}nav .who{color:var(--muted)}
nav form{display:inline}
main{max-width:860px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:30px;margin:0 0 6px;letter-spacing:-.4px}h2{font-size:20px;margin:0 0 12px}.sub{color:var(--muted);margin:0 0 26px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;margin-bottom:14px}
.card.link{display:block;color:inherit;transition:transform .12s,border-color .12s}.card.link:hover{text-decoration:none;transform:translateY(-2px);border-color:var(--accent)}
.meta{color:var(--muted);font-size:13px;display:flex;gap:14px;margin-top:6px}
.badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:2px 8px;border-radius:999px;background:var(--panel-2);color:var(--muted)}
.badge.open{background:rgba(45,212,191,.15);color:var(--accent-2)}.badge.closed{background:rgba(255,92,122,.15);color:var(--danger)}
.btn{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#fff;border:0;border-radius:10px;padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit}
.btn:hover{filter:brightness(1.1)}.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}.btn.danger{background:var(--danger)}.btn.sm{padding:6px 10px;font-size:13px}
input[type=text],input[type=email]{width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:11px 13px;font-size:15px;font-family:inherit}
input:focus{outline:2px solid var(--accent);border-color:transparent}label{display:block;font-size:13px;color:var(--muted);margin:14px 0 6px}
.options{display:grid;gap:10px;margin:18px 0}
.opt{display:flex;align-items:center;gap:12px;background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer}
.opt:hover{border-color:var(--accent)}.opt input{accent-color:var(--accent);width:18px;height:18px}
.bar{position:relative;background:var(--panel-2);border-radius:10px;height:38px;margin:8px 0;overflow:hidden}
.bar .fill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--accent),var(--accent-2));opacity:.45;transition:width .6s ease}
.bar .lbl{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:14px}
.bar.mine .lbl b::after{content:" ✓";color:var(--accent-2)}
.total{color:var(--muted);font-size:13px;margin-top:10px}
.alert{border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:14px;background:rgba(124,92,255,.15);border:1px solid rgba(124,92,255,.4)}
.alert.err{background:rgba(255,92,122,.12);border-color:rgba(255,92,122,.4)}
.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--panel-2);padding:2px 6px;border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
td.actions{text-align:right;white-space:nowrap}td.actions .btn{margin-left:6px}
.htmx-request .btn{opacity:.6;pointer-events:none}
footer{text-align:center;color:var(--muted);font-size:12px;padding:20px}
`;

export interface LayoutProps {
  title?: string;
  user: User | null;
  children?: JSX.Element | JSX.Element[];
}

export function Layout({ title, user, children }: LayoutProps): JSX.Element {
  return (
    <>
      {"<!doctype html>"}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title safe>{title ? `${title} · Pulsebox` : "Pulsebox — live polls"}</title>
          <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
          <style>{css}</style>
        </head>
        <body hx-boost="false">
          <header>
            <a class="brand" href="/"><span class="dot"></span>Pulsebox</a>
            <nav>
              <a href="/">Polls</a>
              {user ? (
                <>
                  <a href="/new">New poll</a>
                  {user.isAdmin ? <a href="/admin">Admin</a> : null}
                  <span class="who" safe>{user.email}</span>
                  <form method="post" action="/logout"><button class="btn ghost sm" type="submit">Log out</button></form>
                </>
              ) : (
                <a class="btn sm" href="/login">Log in</a>
              )}
            </nav>
          </header>
          <main>{children}</main>
          <footer>Pulsebox · Bun + Elysia + HTMX demo · results refresh every 5s</footer>
        </body>
      </html>
    </>
  );
}
