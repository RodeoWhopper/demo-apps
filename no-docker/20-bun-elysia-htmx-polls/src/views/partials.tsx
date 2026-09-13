import type { OptionResult, Poll, PollSummary } from "../db.ts";

/** Live results block; swapped in by HTMX after a vote and every 5 seconds. */
export function Results({ poll, results, myOptionId }: { poll: Poll; results: OptionResult[]; myOptionId: number | null }): JSX.Element {
  const total = results.reduce((s, r) => s + r.votes, 0);
  return (
    <div id="results">
      {results.map((r) => {
        const pct = total ? Math.round((r.votes / total) * 100) : 0;
        return (
          <div class={`bar${r.id === myOptionId ? " mine" : ""}`}>
            <div class="fill" style={`width:${pct}%`}></div>
            <div class="lbl"><b safe>{r.label}</b><span>{r.votes} · {pct}%</span></div>
          </div>
        );
      })}
      <p class="total">
        {total} vote{total === 1 ? "" : "s"}
        {poll.is_closed ? " · poll closed" : myOptionId ? " · you voted, change it any time" : ""}
      </p>
    </div>
  );
}

/** One admin table row; swapped via HTMX on close/reopen/delete. */
export function AdminRow({ poll }: { poll: PollSummary }): JSX.Element {
  const id = `poll-${poll.id}`;
  return (
    <tr id={id}>
      <td>{poll.id}</td>
      <td><a href={`/polls/${poll.id}`} safe>{poll.question}</a></td>
      <td safe>{poll.created_by}</td>
      <td>{poll.vote_count}</td>
      <td>{poll.is_closed ? <span class="badge closed">closed</span> : <span class="badge open">open</span>}</td>
      <td class="actions">
        <button class="btn ghost sm" hx-post={`/admin/polls/${poll.id}/${poll.is_closed ? "reopen" : "close"}`} hx-target={`#${id}`} hx-swap="outerHTML">
          {poll.is_closed ? "Reopen" : "Close"}
        </button>
        <button class="btn danger sm" hx-delete={`/admin/polls/${poll.id}`} hx-target={`#${id}`} hx-swap="outerHTML" hx-confirm="Delete this poll and all its votes?">
          Delete
        </button>
      </td>
    </tr>
  );
}

export function OptionInput({ n }: { n: number }): JSX.Element {
  return (
    <div>
      <label for={`option-${n}`}>Option {n}</label>
      <input type="text" id={`option-${n}`} name="options" maxlength="80" required={n <= 2} />
    </div>
  );
}
