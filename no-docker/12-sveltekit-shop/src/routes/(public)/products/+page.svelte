<script lang="ts">
  import Pot from "$lib/components/Pot.svelte";
  import { money } from "$lib/money";
  let { data } = $props();
</script>

<svelte:head><title>Products · Terracotta Supply</title></svelte:head>

<div class="section-head">
  <h1>Products</h1>
  <nav class="filters" aria-label="Filter by material">
    <a href="/products" class:active={data.material === ""}>All</a>
    {#each data.materials as m}
      <a href={`/products?material=${m}`} class:active={data.material === m}>{m}</a>
    {/each}
  </nav>
</div>

<ul class="grid">
  {#each data.products as p (p.id)}
    <li class="card">
      <a href={`/products/${p.slug}`}>
        <div class="art"><Pot color={p.color} size={120} /></div>
        <h3>{p.name}</h3>
        <p class="muted">{p.material} · {p.sizeCm} cm</p>
        <p class="price">
          {money(p.priceCents)}
          {#if p.stock === 0}<span class="badge sold">sold out</span>{:else if p.stock < 10}<span class="badge">only {p.stock} left</span>{/if}
        </p>
      </a>
    </li>
  {:else}
    <li class="muted">No products in this material.</li>
  {/each}
</ul>
