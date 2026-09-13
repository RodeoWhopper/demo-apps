<script lang="ts">
  import { enhance } from "$app/forms";
  import Pot from "$lib/components/Pot.svelte";
  import { money } from "$lib/money";
  let { data, form } = $props();
</script>

<svelte:head><title>{data.product.name} · Terracotta Supply</title></svelte:head>

<a href="/products" class="back">← All products</a>
<article class="product">
  <div class="art big" style={`--tint:${data.product.color}22`}><Pot color={data.product.color} size={240} /></div>
  <div>
    <p class="eyebrow">{data.product.material} · {data.product.sizeCm} cm</p>
    <h1>{data.product.name}</h1>
    <p class="price big">{money(data.product.priceCents)}</p>
    <p>{data.product.description}</p>
    <p class="muted">{data.product.stock > 0 ? `${data.product.stock} in stock` : "Sold out"}{#if data.inCart} · {data.inCart} in your cart{/if}</p>

    {#if form?.error}<p class="alert error">{form.error}</p>{/if}
    {#if form?.added}<p class="alert ok">Added {form.added} to your cart. <a href="/cart">View cart</a></p>{/if}

    <form method="POST" action="?/add" use:enhance class="inline">
      <label>Qty <input type="number" name="qty" value="1" min="1" max="99" /></label>
      <button class="btn" disabled={data.product.stock === 0}>Add to cart</button>
    </form>
  </div>
</article>
