/** Minimal Server-Sent Events hub. */
export class Hub {
  constructor() {
    this.clients = new Set();
    setInterval(() => this.raw(": ping\n\n"), 25000).unref();
  }
  add(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
  }
  raw(chunk) {
    for (const res of this.clients) res.write(chunk);
  }
  emit(event, data) {
    this.raw(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
