---
title: Dark mode is a test of your system, not a feature
date: 2025-11-08
tags: [design-systems, tokens, accessibility]
summary: If adding a dark theme requires touching components, the problem was never the theme.
readingTime: 5
---

Dark mode requests arrive as a feature. Treat them as an audit.

## What breaks

- Hard-coded colours in components.
- Shadows that assume a light background.
- Images with baked-in white.
- Contrast ratios that only passed on white.

## What to do

Fix the tokens, not the components. Introduce semantic surfaces (`surface.base`, `surface.raised`, `surface.overlay`) and make elevation a *lighter surface* in dark mode rather than a bigger shadow.

## Contrast

Dark mode is where accessibility debt becomes visible. Check every semantic text token against every semantic surface — it is a small matrix and it takes an afternoon.

## The reward

On Atlas, the dark theme shipped in three weeks because the token contract held. The two weeks before that were spent finding the places it didn't.
