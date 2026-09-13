// Production entry: starts the adapter-node build (./build) with demo-friendly defaults.
// SvelteKit needs to know the public origin to accept form submissions (CSRF origin check) and to build
// absolute URLs; set ORIGIN explicitly in production (e.g. https://shop.example.com).
process.env.PORT ??= "3012";
process.env.HOST ??= "0.0.0.0";
if (!process.env.ORIGIN) {
  process.env.ORIGIN = `http://localhost:${process.env.PORT}`;
  console.warn(
    `[terracotta] ORIGIN not set - defaulting to ${process.env.ORIGIN}. ` +
      "Form submissions from any other host will be rejected with 403 until ORIGIN is set to the public URL.",
  );
}
await import("./build/index.js");
