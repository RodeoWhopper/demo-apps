---
title: Design tokens are a contract, not a colour palette
date: 2026-07-14
tags: [design-systems, tokens]
summary: Teams that treat tokens as a list of hex codes miss the point. Tokens are an agreement about what may change and who decides.
readingTime: 6
---

When teams adopt design tokens, they usually start by exporting their colour palette to JSON and calling it done. That is a palette with extra steps.

## What a token actually promises

A token is a **name that will outlive its value**. `color.surface.raised` promises that any component using it will keep working when the value changes for dark mode, a rebrand or a high-contrast theme. The promise is the point; the hex code is incidental.

## Three tiers, no more

- **Primitive** — `violet.600`. Raw values. Nobody outside the system team touches these.
- **Semantic** — `color.action.primary`. What the value *means*.
- **Component** — `button.primary.background`. Only when a component genuinely needs its own knob.

Most systems I audit have skipped the semantic tier and gone straight from primitives to components. That is where the rebrand pain comes from.

## Who may change what

The contract is social as much as technical. Write down who can add a primitive, who can add a semantic token and what review a component token needs. In Atlas we made it a one-page RFC. It was consulted more than the component docs.

## Testing the contract

If you can switch to dark mode by changing only the semantic tier and nothing breaks, your tokens are a contract. If you have to touch components, they are a palette.
