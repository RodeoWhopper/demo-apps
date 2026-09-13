import type { User } from "../auth.ts";
import type { Option, OptionResult, Poll, PollSummary } from "../db.ts";
import { Layout } from "./Layout.tsx";
import { AdminRow, OptionInput, Results } from "./partials.tsx";

export function HomePage({ user, polls }: { user: User | null; polls: PollSummary[] }): JSX.Element {
  return (
    <Layout user={user}>
      <h1>Live polls</h1>
      <p class="sub">Vote on anything. Results update in place — no page reloads.</p>
      {polls.length === 0 ? <div class="card">No polls yet. <a href="/new">Create the first one.</a></div> : null}
      {polls.map((p) => (
        <a class="card link" href={`/polls/${p.id}`}>
          <h2 safe>{p.question}</h2>
          <div class="meta">
            <span>{p.option_count} options</span>
            <span>{p.vote_count} votes</span>
            <span class={`badge ${p.is_closed ? "closed" : "open"}`}>{p.is_closed ? "closed" : "open"}</span>
          </div>
        </a>
      ))}
    </Layout>
  );
}

export function PollPage(props: { user: User | null; poll: Poll; options: Option[]; results: OptionResult[]; myOptionId: number | null }): JSX.Element {
  const { user, poll, options, results, myOptionId } = props;
  return (
    <Layout user={user} title={poll.question}>
      <p><a href="/">← All polls</a></p>
      <h1 safe>{poll.question}</h1>
      <p class="sub">
        by <span safe>{poll.created_by}</span> · {poll.is_closed ? <span class="badge closed">closed</span> : <span class="badge open">open</span>}
      </p>
      <div class="card">
        {poll.is_closed ? (
          <p class="alert">This poll is closed — voting is disabled.</p>
        ) : (
          <form hx-post={`/polls/${poll.id}/vote`} hx-target="#results" hx-swap="outerHTML">
            <div class="options">
              {options.map((o) => (
                <label class="opt">
                  <input type="radio" name="option" value={String(o.id)} checked={o.id === myOptionId} required />
                  <span safe>{o.label}</span>
                </label>
              ))}
            </div>
            <button class="btn" type="submit">{myOptionId ? "Change vote" : "Vote"}</button>
          </form>
        )}
      </div>
      <div class="card" hx-get={`/polls/${poll.id}/results`} hx-trigger="every 5s" hx-target="#results" hx-swap="outerHTML">
        <h2>Results</h2>
        <Results poll={poll} results={results} myOptionId={myOptionId} />
      </div>
    </Layout>
  );
}

export function LoginPage({ error, email }: { error?: string; email?: string }): JSX.Element {
  return (
    <Layout user={null} title="Log in">
      <h1>Log in</h1>
      <p class="sub">Passwordless: we send a 6-digit code to your email. (Demo: the code is printed to the server log.)</p>
      <div class="card">
        {error ? <p class="alert err" safe>{error}</p> : null}
        <form method="post" action="/login">
          <label for="email">Email address</label>
          <input type="email" id="email" name="email" value={email ?? ""} placeholder="you@example.com" required autofocus />
          <p><button class="btn" type="submit">Send code</button></p>
        </form>
        <p class="total">Admin demo account: <span class="code">admin@pulsebox.app</span></p>
      </div>
    </Layout>
  );
}

export function VerifyPage({ email, error, devCode }: { email: string; error?: string; devCode?: string | null }): JSX.Element {
  return (
    <Layout user={null} title="Enter code">
      <h1>Check your inbox</h1>
      <p class="sub">We sent a code to <b safe>{email}</b>. It expires in 10 minutes.</p>
      <div class="card">
        {error ? <p class="alert err" safe>{error}</p> : null}
        {devCode ? (
          <p class="alert">Development mode — your code is <span class="code" safe>{devCode}</span> (also in the server log).</p>
        ) : null}
        <form method="post" action="/login/verify">
          <input type="hidden" name="email" value={email} />
          <label for="code">6-digit code</label>
          <input type="text" id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus />
          <p><button class="btn" type="submit">Verify &amp; log in</button> <a class="btn ghost" href="/login">Use another email</a></p>
        </form>
      </div>
    </Layout>
  );
}

export function NewPollPage({ user, error, optionCount = 3 }: { user: User; error?: string; optionCount?: number }): JSX.Element {
  return (
    <Layout user={user} title="New poll">
      <h1>New poll</h1>
      <p class="sub">A question and 2–8 options. You can close it later from the admin page (admins) or leave it open.</p>
      <div class="card">
        {error ? <p class="alert err" safe>{error}</p> : null}
        <form method="post" action="/new">
          <label for="question">Question</label>
          <input type="text" id="question" name="question" maxlength="160" required autofocus />
          <div id="option-list">
            {Array.from({ length: optionCount }, (_, i) => <OptionInput n={i + 1} />)}
          </div>
          <p>
            <button class="btn ghost sm" type="button" hx-get={`/new/option?n=${optionCount + 1}`} hx-target="#option-list" hx-swap="beforeend">+ Add option</button>
          </p>
          <p><button class="btn" type="submit">Create poll</button></p>
        </form>
      </div>
    </Layout>
  );
}

export function AdminPage({ user, polls }: { user: User; polls: PollSummary[] }): JSX.Element {
  return (
    <Layout user={user} title="Admin">
      <h1>Admin</h1>
      <p class="sub">All polls. Close/reopen and delete are HTMX requests that swap the table row in place.</p>
      <div class="card">
        <table>
          <thead><tr><th>#</th><th>Question</th><th>Owner</th><th>Votes</th><th>Status</th><th></th></tr></thead>
          <tbody>{polls.map((p) => <AdminRow poll={p} />)}</tbody>
        </table>
      </div>
    </Layout>
  );
}

export function ErrorPage({ user, status, message }: { user: User | null; status: number; message: string }): JSX.Element {
  return (
    <Layout user={user} title={String(status)}>
      <h1>{status}</h1>
      <p class="sub" safe>{message}</p>
      <p><a class="btn ghost" href="/">Back to polls</a></p>
    </Layout>
  );
}
