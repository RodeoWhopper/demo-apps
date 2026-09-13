<script lang="ts">
  import { money } from "$lib/money";
  let { data } = $props();
</script>

<svelte:head><title>Admin · Terracotta Supply</title></svelte:head>

<div class="section-head">
  <h1>Shop admin</h1>
  <a class="btn small" href="/admin/products">Manage products</a>
</div>

<div class="stats">
  <div class="stat"><span class="label">Products</span><strong>{data.stats.products}</strong><span class="muted">{data.stats.soldOut} sold out</span></div>
  <div class="stat"><span class="label">Customers</span><strong>{data.stats.customers}</strong></div>
  <div class="stat"><span class="label">Orders</span><strong>{data.stats.orders}</strong></div>
  <div class="stat"><span class="label">Revenue</span><strong>{money(data.stats.revenueCents)}</strong></div>
</div>

<div class="two-col">
  <section class="panel">
    <h2>Recent orders</h2>
    {#if data.recent.length === 0}<p class="muted">No orders yet.</p>{/if}
    <ul class="list">
      {#each data.recent as o (o.id)}
        <li><code>{o.id}</code> · {o.email} · {o.lines.reduce((s, l) => s + l.qty, 0)} items · <strong>{money(o.totalCents)}</strong></li>
      {/each}
    </ul>
  </section>
  <section class="panel">
    <h2>Low stock (&lt; 10)</h2>
    <ul class="list">
      {#each data.lowStock as p (p.id)}
        <li>{p.name} — <strong class:danger={p.stock === 0}>{p.stock}</strong></li>
      {:else}
        <li class="muted">Everything is well stocked.</li>
      {/each}
    </ul>
  </section>
</div>
