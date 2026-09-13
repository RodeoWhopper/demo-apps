---
title: Design your component API like a public one
date: 2026-03-19
tags: [design-systems, engineering]
summary: Props are a user interface for engineers. Naming, defaults and escape hatches deserve the same care as the visual layer.
readingTime: 7
---

Designers often stop at the visual spec. But the component's props are the interface most of your colleagues will actually use, dozens of times a day.

## Naming

Prefer intent over appearance: `variant="danger"` ages better than `color="red"`. Boolean props should read naturally as adjectives: `disabled`, `loading`, `compact`.

## Defaults

The default should be the thing you want people to reach for 80% of the time. If you find yourself writing `size="md"` everywhere, medium should be the default.

## Escape hatches

Every system needs a way out, or people fork. A `class` passthrough and a `slot` for content are cheaper than a hundred one-off props.

## Deprecation

Write the deprecation path before you ship the prop. In Atlas we shipped a lint rule with each deprecation and gave teams one quarter. It was never popular and always worked.

```vue
<AButton variant="primary" :loading="saving" @click="save">
  Save changes
</AButton>
```

Small, boring and readable. That is the goal.
