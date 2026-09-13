<script lang="ts">
  import { enhance } from "$app/forms";
  import Pot from "$lib/components/Pot.svelte";
  import { money } from "$lib/money";
  let { data, form } = $props();
</script>

<svelte:head><title>Cart · Terracotta Supply</title></svelte:head>

<h1>Your cart</h1>
{#if form?.error}<p class="alert error">{form.error}</p>{/if}

{#if data.lines.length === 0}
  <p class="muted">Your cart is empty. <a href="/products">Find a pot →</a></p>
{:else}
  <table class="table">
    <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Line</th><th></th></tr></thead>
    <tbody>
      {#each data.lines as line (line.product.id)}
        <tr>
          <td class="item"><Pot color={line.product.color} size={40} /> <a href={`/products/${line.product.slug}`}>{line.product.name}</a></td>
          <td>{money(line.product.priceCents)}</td>
          <td>
            <form method="POST" action="?/update" use:enhance class="inline">
              <input type="hidden" name="productId" value={line.product.id} />
              <input type="number" name="qty" value={line.qty} min="0" max="99" />
              <button class="btn small ghost">Update</button>
            </form>
          </td>
          <td>{money(line.lineCents)}</td>
          <td>
            <form method="POST" action="?/remove" use:enhance>
              <input type="hidden" name="productId" value={line.product.id} />
              <button class="link danger">Remove</button>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
    <tfoot><tr><td colspan="3">Total</td><td colspan="2"><strong>{money(data.total)}</strong></td></tr></tfoot>
  </table>

  <form method="POST" action="?/checkout" use:enhance class="checkout">
    {#if data.signedIn}
      <button class="btn">Place order</button>
    {:else}
      <p class="muted">Sign in to check out.</p>
      <button class="btn">Sign in &amp; place order</button>
    {/if}
  </form>
{/if}
