<script lang="ts">
  import Pot from "$lib/components/Pot.svelte";
  import { money } from "$lib/money";
  let { data } = $props();
</script>

<svelte:head><title>Terracotta Supply</title></svelte:head>

<section class="hero">
  <div>
    <p class="eyebrow">Fired in small batches</p>
    <h1>Pots that let roots breathe.</h1>
    <p class="lede">
      Terracotta Supply is a fictional plant-pot shop built as a demo: browse {data.count}
      products, fill a cookie-backed cart, check out with a server-side session and watch orders land in a JSON store.
    </p>
    <div class="actions">
      <a class="btn" href="/products">Browse the range</a>
      <a class="btn ghost" href="/login">Sign in</a>
    </div>
  </div>
  <div class="hero-art"><Pot color="#c2410c" size={220} /></div>
</section>

<section>
  <div class="section-head">
    <h2>Featured this season</h2>
    <a href="/products">All products →</a>
  </div>
  <ul class="grid">
    {#each data.featured as p (p.id)}
      <li class="card">
        <a href={`/products/${p.slug}`}>
          <div class="art"><Pot color={p.color} size={120} /></div>
          <h3>{p.name}</h3>
          <p class="muted">{p.material} · {p.sizeCm} cm</p>
          <p class="price">{money(p.priceCents)}</p>
        </a>
      </li>
    {/each}
  </ul>
</section>
