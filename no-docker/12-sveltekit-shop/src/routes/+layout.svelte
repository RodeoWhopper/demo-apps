<script lang="ts">
  import "../app.css";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  let { data, children } = $props();
  const active = (path: string) => page.url.pathname === path || page.url.pathname.startsWith(path + "/");
</script>

<header class="site-header">
  <a class="brand" href="/">
    <span class="mark"></span>
    Terracotta <em>Supply</em>
  </a>
  <nav>
    <a href="/products" class:active={active("/products")}>Products</a>
    <a href="/cart" class:active={active("/cart")}>Cart{#if data.cartCount} <span class="pill">{data.cartCount}</span>{/if}</a>
    {#if data.user}
      <a href="/account" class:active={active("/account")}>Account</a>
      {#if data.user.role === "admin"}<a href="/admin" class="admin" class:active={active("/admin")}>Admin</a>{/if}
      <form method="POST" action="/logout" use:enhance><button class="link">Sign out</button></form>
    {:else}
      <a href="/login" class="btn small">Sign in</a>
    {/if}
  </nav>
</header>

<main class="container">
  {@render children()}
</main>

<footer class="site-footer">
  Terracotta Supply is a fictional shop built as a demo · SvelteKit 2 · Svelte 5 · adapter-node
</footer>
