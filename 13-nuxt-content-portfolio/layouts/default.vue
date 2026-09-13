<template>
  <div class="site">
    <a class="skip" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main" class="site-main">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
