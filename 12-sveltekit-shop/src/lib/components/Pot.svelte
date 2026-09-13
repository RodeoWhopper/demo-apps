<script lang="ts">
  let { color = "#c2410c", size = 96 }: { color?: string; size?: number } = $props();
</script>

<svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class="pot">
  <ellipse cx="50" cy="90" rx="34" ry="5" fill="rgba(0,0,0,0.12)" />
  <path d="M22 30h56l-3 8H25z" fill={color} />
  <path d="M27 38h46l-6 48H33z" fill={color} />
  <path d="M27 38h46l-6 48H33z" fill="rgba(255,255,255,0.14)" clip-path="inset(0 50% 0 0)" />
  <path d="M40 30c0-12 6-18 10-22 4 4 10 10 10 22" fill="none" stroke="#3f6b3a" stroke-width="4" stroke-linecap="round" />
  <path d="M50 8c-6 4-9 10-8 16 6-1 10-6 8-16z" fill="#5c8a52" />
  <path d="M50 8c6 4 9 10 8 16-6-1-10-6-8-16z" fill="#4f7a46" />
</svg>
