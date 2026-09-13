<script lang="ts">
  import { enhance } from "$app/forms";
  let { data, form } = $props();
</script>

<svelte:head><title>Sign in · Terracotta Supply</title></svelte:head>

<div class="panel narrow">
  <h1>Sign in</h1>
  <p class="muted">Cookie session resolved in <code>hooks.server.ts</code>; this form is a SvelteKit form action (<code>?/login</code>).</p>
  {#if form?.error}<p class="alert error">{form.error}</p>{/if}
  <form method="POST" action="?/login" use:enhance>
    <input type="hidden" name="next" value={data.next} />
    <label>Email <input type="email" name="email" value={form?.email ?? "shopper@terracotta.shop"} required autocomplete="email" /></label>
    <label>Password <input type="password" name="password" required autocomplete="current-password" /></label>
    <button class="btn">Sign in</button>
  </form>
  <p class="muted small">No account? <a href="/register">Create one</a>.</p>
  <div class="demo">
    <strong>Demo accounts</strong>
    <div><code>owner@terracotta.shop</code> / <code>Owner123!</code> — admin</div>
    <div><code>shopper@terracotta.shop</code> / <code>Shop123!</code> — customer</div>
  </div>
</div>
