---
title: Atlas — a design system for 40 product teams
client: Atlas Software (internal)
year: 2023
role: Design systems lead
summary: Building and rolling out a token-based design system across three frameworks, with adoption tracked as a product metric.
accent: "#6b4fe0"
order: 3
outcome: 84% of new UI shipped with Atlas components within a year; design QA time per release fell from three days to half a day.
---

## Starting point

Atlas had four internal component libraries, two of them called "core". Teams were re-implementing date pickers every quarter. The CEO's ask was simple: "make it look like one company".

## Tokens first

We began with tokens rather than components: colour, spacing, type, radius and elevation, published as JSON and compiled to CSS variables, Tailwind config and Swift constants. Getting tokens right early meant three frameworks could move at their own pace and still match.

## Components as a product

The unusual decision was to treat the system as a product with its own roadmap, an intake process and — most importantly — **adoption metrics**. We instrumented the component package so we could see which teams used which components. The dashboard did more for adoption than any all-hands.

## Documentation

Every component page had the same four sections: when to use, when not to, accessibility notes, and a live playground. Writing the "when not to" section was often where the real design work happened.

## Governance that didn't hurt

Contributions were welcome but reviewed weekly by a rotating pair of one designer and one engineer. Anything used by two or more teams graduated into the core; anything used by one stayed local. That rule alone kept the system small.
