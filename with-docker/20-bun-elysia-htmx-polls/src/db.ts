import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.ts";

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath, { create: true });
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);

  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    created_by TEXT NOT NULL,
    is_closed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_options_poll ON options(poll_id);

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    voter_key TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE (poll_id, voter_key)
  );
`);

export interface Poll {
  id: number;
  question: string;
  created_by: string;
  is_closed: number;
  created_at: number;
}

export interface Option {
  id: number;
  poll_id: number;
  label: string;
  position: number;
}

export interface OptionResult extends Option {
  votes: number;
}

export interface PollSummary extends Poll {
  option_count: number;
  vote_count: number;
}

const q = {
  listPolls: db.query<PollSummary, []>(`
    SELECT p.*,
      (SELECT COUNT(*) FROM options o WHERE o.poll_id = p.id) AS option_count,
      (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id) AS vote_count
    FROM polls p ORDER BY p.is_closed ASC, p.created_at DESC`),
  getPoll: db.query<Poll, [number]>("SELECT * FROM polls WHERE id = ?"),
  getOptions: db.query<Option, [number]>("SELECT * FROM options WHERE poll_id = ? ORDER BY position"),
  getResults: db.query<OptionResult, [number]>(`
    SELECT o.*, (SELECT COUNT(*) FROM votes v WHERE v.option_id = o.id) AS votes
    FROM options o WHERE o.poll_id = ? ORDER BY o.position`),
  getVote: db.query<{ option_id: number }, [number, string]>(
    "SELECT option_id FROM votes WHERE poll_id = ? AND voter_key = ?"),
  upsertVote: db.query<void, [number, number, string]>(`
    INSERT INTO votes (poll_id, option_id, voter_key) VALUES (?1, ?2, ?3)
    ON CONFLICT(poll_id, voter_key) DO UPDATE SET option_id = ?2, created_at = unixepoch()`),
  insertPoll: db.query<{ id: number }, [string, string]>(
    "INSERT INTO polls (question, created_by) VALUES (?, ?) RETURNING id"),
  insertOption: db.query<void, [number, string, number]>(
    "INSERT INTO options (poll_id, label, position) VALUES (?, ?, ?)"),
  setClosed: db.query<void, [number, number]>("UPDATE polls SET is_closed = ? WHERE id = ?"),
  deletePoll: db.query<void, [number]>("DELETE FROM polls WHERE id = ?"),
  countPolls: db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM polls"),
};

export const polls = {
  list: () => q.listPolls.all(),
  get: (id: number) => q.getPoll.get(id) ?? null,
  options: (pollId: number) => q.getOptions.all(pollId),
  results: (pollId: number) => q.getResults.all(pollId),
  voteOf: (pollId: number, voterKey: string) => q.getVote.get(pollId, voterKey)?.option_id ?? null,
  vote(pollId: number, optionId: number, voterKey: string) {
    q.upsertVote.run(pollId, optionId, voterKey);
  },
  create: db.transaction((question: string, options: string[], createdBy: string): number => {
    const { id } = q.insertPoll.get(question, createdBy)!;
    options.forEach((label, i) => q.insertOption.run(id, label, i));
    return id;
  }),
  setClosed: (id: number, closed: boolean) => q.setClosed.run(closed ? 1 : 0, id),
  delete: (id: number) => q.deletePoll.run(id),
  count: () => q.countPolls.get()!.n,
};

/** Seed three demo polls (with a handful of votes) on an empty database. */
export function seedIfEmpty(): void {
  if (polls.count() > 0) return;
  const seed: Array<[string, string[], number[]]> = [
    ["Which runtime do you reach for on a new side project?", ["Bun", "Node.js", "Deno", "Something else"], [14, 9, 3, 1]],
    ["Best time for the weekly team sync?", ["Monday 10:00", "Tuesday 14:00", "Thursday 11:00"], [4, 7, 5]],
    ["Tabs or spaces?", ["Tabs", "Spaces", "I let the formatter decide"], [6, 8, 12]],
  ];
  let voter = 0;
  for (const [question, options, counts] of seed) {
    const id = polls.create(question, options, "admin@pulsebox.app");
    const opts = polls.options(id);
    counts.forEach((n, i) => {
      for (let k = 0; k < n; k++) polls.vote(id, opts[i]!.id, `seed:${voter++}`);
    });
  }
  console.log("[pulsebox] seeded 3 demo polls");
}
