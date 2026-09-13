<script lang="ts">
  import { money } from "$lib/money";
  let { data } = $props();
</script>

<svelte:head><title>Orders · Terracotta Supply</title></svelte:head>

<a href="/account" class="back">← Account</a>
<h1>Your orders</h1>
{#if data.placed}<p class="alert ok">Order <code>{data.placed}</code> placed. Thank you!</p>{/if}

{#if data.orders.length === 0}
  <p class="muted">No orders yet. <a href="/products">Start with a pot →</a></p>
{:else}
  {#each data.orders as order (order.id)}
    <section class="panel order">
      <header>
        <strong>{order.id}</strong>
        <span class="badge">{order.status}</span>
        <span class="muted">{new Date(order.createdAt).toLocaleString("en-GB")}</span>
        <span class="total">{money(order.totalCents)}</span>
      </header>
      <ul>
        {#each order.lines as line}
          <li>{line.qty} × {line.name} <span class="muted">@ {money(line.unitCents)}</span></li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}
