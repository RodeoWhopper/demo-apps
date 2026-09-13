---
title: Harbor — a logistics dashboard that stopped shouting
client: Harbor Freight Systems
year: 2025
role: Lead product designer
summary: Redesigning a port-operations dashboard used by 1,400 dispatchers, replacing 37 alert colours with a single priority model.
accent: "#0f8b8d"
order: 1
outcome: Average time to acknowledge a critical delay dropped from 6.5 to 1.8 minutes; support tickets about "missed alerts" fell 71% in the first quarter.
---

## The problem

Harbor's dispatch console had grown for nine years without a designer. Every team that needed attention added a colour. By the time I arrived there were 37 distinct alert colours, five kinds of blinking and a legend nobody could find.

Dispatchers had adapted the only way they could: they ignored everything.

## Research

I spent two weeks in the Rotterdam and Mersin control rooms. The most useful moment was watching a senior dispatcher run the whole shift from a personal spreadsheet because "the screen is noise". That spreadsheet became the basis of the new information hierarchy: **what is late, how late, and who is waiting**.

## The priority model

We collapsed every alert into a three-level model:

| Level | Meaning | Visual treatment |
|-------|---------|------------------|
| P1 | A vessel or truck is blocked *now* | Solid accent bar, sound once, stays until acknowledged |
| P2 | Something will be late within the hour | Outlined chip, no sound |
| P3 | Informational | Text only, collapsed by default |

Everything else became a filter, not a colour.

## Shipping it

Rather than a big-bang launch we shipped the new alert rail beside the old console for six weeks and let dispatchers switch. Adoption was voluntary and reached 92% before we removed the old view. Engineering built the rail from the design-system components we created in parallel, so the second and third screens took days instead of months.

## What I'd do differently

I would involve the night shift earlier. Their lighting and fatigue patterns pushed us to darken the palette late in the project, which cost us a sprint.
