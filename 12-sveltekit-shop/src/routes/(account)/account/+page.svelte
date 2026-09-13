<script lang="ts">
  import { money } from "$lib/money";
  let { data } = $props();
</script>

<svelte:head><title>Account · Terracotta Supply</title></svelte:head>

<h1>Hello, {data.user.name}</h1>
<div class="stats">
  <div class="stat"><span class="label">Signed in as</span><strong>{data.user.email}</strong><span class="muted">{data.user.role}</span></div>
  <div class="stat"><span class="label">Orders</span><strong>{data.orderCount}</strong><a href="/account/orders">View orders →</a></div>
  <div class="stat"><span class="label">Total spent</span><strong>{money(data.spentCents)}</strong></div>
  <div class="stat"><span class="label">Sessions on this server</span><strong>{data.activeSessions}</strong><span class="muted">persisted to sessions.json</span></div>
</div>
