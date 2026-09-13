---
title: Fieldnote — a research tool for people who hate research tools
client: Fieldnote (side project)
year: 2022
role: Solo designer and front-end
summary: A small mobile-first app for capturing interview notes, tagging them on the spot and synthesising in the evening.
accent: "#2b9348"
order: 4
outcome: Used by 300 researchers in its first year; taught me more about constraints than any client project.
---

## Why

Every research project I ran ended with a wall of sticky notes that nobody photographed properly. I wanted a tool that fit in a pocket, worked offline in a factory and produced a synthesis board without an export step.

## Constraints as features

- **Offline first.** Notes save locally and sync when they can.
- **One-thumb tagging.** Tags are big, few and set up before the session.
- **No accounts.** A project is a shareable link with a passphrase.

## Building it alone

I built Fieldnote in Vue with a tiny sync server. Designing and building the same thing forced honesty: every clever interaction had a cost I had to pay myself, so most of them didn't survive.

## What stuck

The evening synthesis view — a board that clusters notes by tag with a swipe — is the feature people write to me about. It exists because I was too tired one night to do it manually.
