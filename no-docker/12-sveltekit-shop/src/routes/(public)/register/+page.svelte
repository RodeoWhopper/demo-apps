<script lang="ts">
  import { enhance } from "$app/forms";
  let { form } = $props();
</script>

<svelte:head><title>Create account · Terracotta Supply</title></svelte:head>

<div class="panel narrow">
  <h1>Create an account</h1>
  {#if form?.error}<p class="alert error">{form.error}</p>{/if}
  <form method="POST" action="?/register" use:enhance>
    <label>Name <input name="name" value={form?.name ?? ""} required autocomplete="name" /></label>
    <label>Email <input type="email" name="email" value={form?.email ?? ""} required autocomplete="email" /></label>
    <label>Password <input type="password" name="password" minlength="8" required autocomplete="new-password" /></label>
    <button class="btn">Create account</button>
  </form>
  <p class="muted small">Already registered? <a href="/login">Sign in</a>.</p>
</div>
