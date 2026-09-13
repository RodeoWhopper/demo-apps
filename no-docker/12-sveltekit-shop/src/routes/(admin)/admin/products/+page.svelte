<script lang="ts">
  import { enhance } from "$app/forms";
  import Pot from "$lib/components/Pot.svelte";
  import { money } from "$lib/money";
  let { data, form } = $props();
  let editing = $state<string | null>(null);
</script>

<svelte:head><title>Products admin · Terracotta Supply</title></svelte:head>

<a href="/admin" class="back">← Admin</a>
<div class="section-head">
  <h1>Products</h1>
  <span class="muted">{data.products.length} products · CRUD via form actions (<code>?/create</code>, <code>?/update</code>, <code>?/delete</code>)</span>
</div>

{#if form?.ok}<p class="alert ok">{form.ok}</p>{/if}
{#if form?.errors}<ul class="alert error">{#each form.errors as e}<li>{e}</li>{/each}</ul>{/if}

{#snippet fields(p: { name: string; description: string; material: string; sizeCm: number; priceCents: number; stock: number; color: string; featured: boolean } | null)}
  <label>Name <input name="name" value={p?.name ?? ""} required /></label>
  <label>Material
    <select name="material">
      {#each data.materials as m}<option value={m} selected={p?.material === m}>{m}</option>{/each}
    </select>
  </label>
  <label>Size (cm) <input type="number" name="sizeCm" value={p?.sizeCm ?? 14} min="5" max="120" required /></label>
  <label>Price (USD) <input type="number" name="price" step="0.01" min="0" value={p ? (p.priceCents / 100).toFixed(2) : "12.00"} required /></label>
  <label>Stock <input type="number" name="stock" min="0" value={p?.stock ?? 10} required /></label>
  <label>Colour <input type="color" name="color" value={p?.color ?? "#c2410c"} /></label>
  <label class="wide">Description <textarea name="description" rows="2">{p?.description ?? ""}</textarea></label>
  <label class="check"><input type="checkbox" name="featured" checked={p?.featured ?? false} /> Featured on the home page</label>
{/snippet}

<section class="panel">
  <h2>Add a product</h2>
  <form method="POST" action="?/create" use:enhance class="form-grid">
    {@render fields(null)}
    <button class="btn">Create product</button>
  </form>
</section>

<table class="table">
  <thead><tr><th></th><th>Name</th><th>Material</th><th>Size</th><th>Price</th><th>Stock</th><th></th></tr></thead>
  <tbody>
    {#each data.products as p (p.id)}
      <tr>
        <td><Pot color={p.color} size={36} /></td>
        <td><a href={`/products/${p.slug}`}>{p.name}</a>{#if p.featured} <span class="badge">featured</span>{/if}</td>
        <td>{p.material}</td>
        <td>{p.sizeCm} cm</td>
        <td>{money(p.priceCents)}</td>
        <td class:danger={p.stock === 0}>{p.stock}</td>
        <td class="actions">
          <button class="link" onclick={() => (editing = editing === p.id ? null : p.id)}>{editing === p.id ? "Close" : "Edit"}</button>
          <form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm(`Delete ${p.name}?`)) e.preventDefault(); }}>
            <input type="hidden" name="id" value={p.id} />
            <button class="link danger">Delete</button>
          </form>
        </td>
      </tr>
      {#if editing === p.id}
        <tr class="edit-row">
          <td colspan="7">
            <form method="POST" action="?/update" use:enhance class="form-grid">
              <input type="hidden" name="id" value={p.id} />
              {@render fields(p)}
              <button class="btn">Save changes</button>
            </form>
          </td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>
