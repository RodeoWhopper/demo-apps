<script lang="ts">
  import { page } from "$app/state";
</script>

<svelte:head><title>{page.status} · Terracotta Supply</title></svelte:head>
<div class="panel narrow center">
  <p class="status">{page.status}</p>
  <h1>{page.status === 404 ? "That pot has been repotted" : page.status === 403 ? "Staff only" : "Something cracked"}</h1>
  <p class="muted">{page.error?.message}</p>
  <a class="btn" href="/">Back to the shop</a>
</div>
