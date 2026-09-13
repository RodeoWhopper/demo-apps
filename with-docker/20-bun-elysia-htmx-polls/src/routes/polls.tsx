import { Elysia, t } from "elysia";
import { polls } from "../db.ts";
import { requireAuth, session } from "../plugins.ts";
import { ErrorPage, HomePage, NewPollPage, PollPage } from "../views/pages.tsx";
import { OptionInput, Results } from "../views/partials.tsx";

const idParam = { params: t.Object({ id: t.Numeric() }) };

export const pollRoutes = new Elysia()
  .use(session)
  .get("/", ({ user }) => HomePage({ user, polls: polls.list() }))

  .get("/polls/:id", ({ params: { id }, user, voterKey, set }) => {
    const poll = polls.get(id);
    if (!poll) {
      set.status = 404;
      return ErrorPage({ user, status: 404, message: "That poll does not exist." });
    }
    return PollPage({ user, poll, options: polls.options(id), results: polls.results(id), myOptionId: polls.voteOf(id, voterKey) });
  }, idParam)

  // HTMX partial: refreshed every 5s by the poll page.
  .get("/polls/:id/results", ({ params: { id }, voterKey, set }) => {
    const poll = polls.get(id);
    if (!poll) {
      set.status = 404;
      return "";
    }
    return Results({ poll, results: polls.results(id), myOptionId: polls.voteOf(id, voterKey) });
  }, idParam)

  // HTMX vote: returns the updated results partial (one vote per voter, changeable).
  .post("/polls/:id/vote", ({ params: { id }, body, voterKey, set }) => {
    const poll = polls.get(id);
    if (!poll) {
      set.status = 404;
      return "";
    }
    const option = polls.options(id).find((o) => o.id === body.option);
    if (!poll.is_closed && option) {
      polls.vote(id, option.id, voterKey);
    } else {
      set.status = poll.is_closed ? 409 : 422;
    }
    return Results({ poll, results: polls.results(id), myOptionId: polls.voteOf(id, voterKey) });
  }, { ...idParam, body: t.Object({ option: t.Numeric() }) })

  // Authenticated: create a poll.
  .guard({ beforeHandle: requireAuth }, (app) =>
    app
      .get("/new", ({ user }) => NewPollPage({ user: user! }))
      .get("/new/option", ({ query }) => OptionInput({ n: Math.min(Math.max(Number(query.n) || 3, 3), 8) }))
      .post("/new", ({ body, user, set, redirect }) => {
        const question = body.question.trim();
        const raw = Array.isArray(body.options) ? body.options : [body.options];
        const options = [...new Set(raw.map((o) => o.trim()).filter(Boolean))].slice(0, 8);
        if (question.length < 5 || question.length > 160) {
          set.status = 422;
          return NewPollPage({ user: user!, error: "The question must be between 5 and 160 characters.", optionCount: Math.max(3, raw.length) });
        }
        if (options.length < 2) {
          set.status = 422;
          return NewPollPage({ user: user!, error: "Give at least two distinct options.", optionCount: Math.max(3, raw.length) });
        }
        const id = polls.create(question, options, user!.email);
        return redirect(`/polls/${id}`, 303);
      }, { body: t.Object({ question: t.String(), options: t.Union([t.String(), t.Array(t.String())]) }) }),
  );
