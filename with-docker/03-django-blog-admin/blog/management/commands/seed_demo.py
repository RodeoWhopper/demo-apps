"""
Idempotent demo seed: users, categories, posts and comments.

Safe to run on every container start; existing rows are updated in place
(matched by username / slug) and demo passwords are reset so the documented
credentials always work.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from blog.models import Category, Comment, Post

CATEGORIES = [
    ("Craft", "craft", "On the discipline of writing well."),
    ("Typography", "typography", "Letters, spacing and the shape of a page."),
    ("Field Notes", "field-notes", "Dispatches, observations and small essays."),
]

POSTS = [
    {
        "title": "Why Long-Form Still Matters",
        "slug": "why-long-form-still-matters",
        "category": "craft",
        "author": "editor",
        "days_ago": 30,
        "excerpt": "Attention is scarce, which is exactly why a well-built essay earns it.",
        "body": """Every few years someone announces the death of the essay. The reader, we are told, has moved on to
something shorter. And yet the pieces people *actually* forward to each other are almost always long.

## The case for length

A long piece is not a short piece with more words. It is a different object:

- It can hold a contradiction long enough to examine it.
- It can earn a conclusion instead of asserting one.
- It leaves room for the reader to disagree in the margins.

> Brevity is a courtesy. Depth is a gift.

## What we do here

Pergament publishes essays that take their time. We edit slowly, we typeset carefully, and we do not
run advertising. If that sounds like your kind of place, [subscribe to the feed](/feed/).
""",
    },
    {
        "title": "A Short History of the Em Dash",
        "slug": "a-short-history-of-the-em-dash",
        "category": "typography",
        "author": "editor",
        "days_ago": 26,
        "excerpt": "The most argued-about glyph in English punctuation, and how it got that way.",
        "body": """The em dash — that long horizontal stroke — is exactly one *em* wide, the width of the type size itself.
In twelve-point type it is twelve points long.

### Three dashes, three jobs

| Glyph | Name | Typical use |
|-------|------|-------------|
| -     | hyphen | compound words |
| –     | en dash | ranges (1990–1999) |
| —     | em dash | interruption or emphasis |

Printers set the em dash *closed up* (no spaces) in most American styles, while many British houses
prefer a spaced en dash. Neither is wrong. Consistency is what readers notice.
""",
    },
    {
        "title": "Editing Is Rewriting, Slowly",
        "slug": "editing-is-rewriting-slowly",
        "category": "craft",
        "author": "admin",
        "days_ago": 21,
        "excerpt": "A working editor's checklist for the second draft.",
        "body": """The first draft exists so that the second draft has something to argue with.

## The checklist

1. Read the whole thing aloud. Anywhere you stumble, the reader will too.
2. Cut the first paragraph. It was warm-up.
3. Find every *very*, *really* and *quite*. Delete them.
4. Replace abstract nouns with the concrete thing you meant.
5. Check that each section could stand as its own small essay.

```text
draft 1: 2,400 words
draft 2: 1,650 words
draft 3: 1,700 words (some things needed saying)
```

Editing is not about making things shorter. It is about making things *truer*.
""",
    },
    {
        "title": "Field Notes from a Letterpress Shop",
        "slug": "field-notes-from-a-letterpress-shop",
        "category": "field-notes",
        "author": "editor",
        "days_ago": 17,
        "excerpt": "Two days learning to set metal type by hand, and what it taught me about margins.",
        "body": """The shop smells of oil and paper. Cases of metal type line the walls, each drawer a small alphabet.

Setting a single line takes minutes. Setting a paragraph takes the better part of an hour. You learn
quickly that **white space is not empty** — it is made of physical slugs of lead you have to place by hand.

## What the press teaches

- Margins are a decision, not a default.
- Leading (the space between lines) is the difference between readable and cramped.
- Every correction costs something, so you think before you set.

Digital tools hide these costs. That is mostly a good thing. But it is worth remembering that they exist.
""",
    },
    {
        "title": "Choosing a Body Typeface",
        "slug": "choosing-a-body-typeface",
        "category": "typography",
        "author": "admin",
        "days_ago": 12,
        "excerpt": "Serif or sans? Old-style or transitional? A practical guide for the undecided.",
        "body": """A body typeface has one job: to disappear. If the reader notices it, something has gone wrong.

## Questions to ask

- **Where will it be read?** Screens favour slightly larger x-heights and open counters.
- **How long is the text?** Long essays reward old-style serifs with gentle contrast.
- **What is the tone?** A transitional serif reads as considered; a geometric sans reads as brisk.

For Pergament we use the reader's own system serif. It is already installed, it renders well, and it
costs nothing to load.
""",
    },
    {
        "title": "The Reader's Margin",
        "slug": "the-readers-margin",
        "category": "field-notes",
        "author": "editor",
        "days_ago": 8,
        "excerpt": "Marginalia as a conversation between author and reader.",
        "body": """Second-hand books carry their previous readers with them. A pencilled *no!* beside a paragraph is
an argument with someone you will never meet.

We built comments on Pergament to be that margin. They are moderated — not to silence disagreement,
but to keep the margin legible. Say something worth pencilling in.
""",
    },
    {
        "title": "Notes on Reading Slowly",
        "slug": "notes-on-reading-slowly",
        "category": "craft",
        "author": "admin",
        "days_ago": 3,
        "excerpt": "Speed-reading optimises for the wrong thing.",
        "body": """Speed-reading courses promise a thousand words a minute. What they deliver is a thousand words a
minute *skimmed*. Reading slowly is not a deficiency; it is how comprehension happens.

## Three habits

1. Read with a pencil. Physical or otherwise.
2. Stop at the end of a section and say, in one sentence, what it claimed.
3. Re-read the paragraph you liked most. Work out why.
""",
    },
    {
        "title": "Draft: On Footnotes",
        "slug": "draft-on-footnotes",
        "category": "typography",
        "author": "editor",
        "days_ago": None,
        "excerpt": "An unfinished argument about the humble footnote.",
        "body": """*This post is still a draft and is only visible to its author and staff.*

Footnotes are where authors put the things they could not bear to cut...
""",
    },
]

COMMENTS = [
    ("why-long-form-still-matters", "Mara K.", "Forwarded this to my whole team. Thank you.", True),
    ("why-long-form-still-matters", "Tobias", "Disagree on brevity, but a good read.", True),
    ("a-short-history-of-the-em-dash", "Anneli", "The table alone was worth it.", True),
    ("editing-is-rewriting-slowly", "Jules", "Cutting the first paragraph hurt. It was right.", True),
    ("field-notes-from-a-letterpress-shop", "Petra", "Which shop was this? I would love to visit.", False),
    ("the-readers-margin", "Sam O.", "no!", False),
]


class Command(BaseCommand):
    help = "Seed demo users, categories, posts and comments (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@pergament.dev", "first_name": "Ada", "last_name": "Admin"},
        )
        admin.is_staff = True
        admin.is_superuser = True
        admin.set_password("Admin123!")
        admin.save()

        editor, _ = User.objects.get_or_create(
            username="editor",
            defaults={"email": "editor@pergament.dev", "first_name": "Elias", "last_name": "Editor"},
        )
        editor.is_staff = False
        editor.set_password("Editor123!")
        editor.save()

        users = {"admin": admin, "editor": editor}

        categories = {}
        for name, slug, description in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                slug=slug, defaults={"name": name, "description": description}
            )
            categories[slug] = category

        now = timezone.now()
        for item in POSTS:
            published = item["days_ago"] is not None
            defaults = {
                "title": item["title"],
                "author": users[item["author"]],
                "category": categories[item["category"]],
                "excerpt": item["excerpt"],
                "body": item["body"].strip(),
                "status": Post.Status.PUBLISHED if published else Post.Status.DRAFT,
                "published_at": now - timedelta(days=item["days_ago"]) if published else None,
            }
            Post.objects.update_or_create(slug=item["slug"], defaults=defaults)

        for slug, name, body, moderated in COMMENTS:
            Comment.objects.get_or_create(
                post=Post.objects.get(slug=slug),
                author_name=name,
                body=body,
                defaults={"moderated": moderated},
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded: %d users, %d categories, %d posts, %d comments"
                % (User.objects.count(), Category.objects.count(), Post.objects.count(), Comment.objects.count())
            )
        )
