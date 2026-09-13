import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { products } from "$lib/server/db";

export const GET: RequestHandler = () =>
  json({ status: "ok", app: "terracotta-supply", products: products.read().length, time: new Date().toISOString() });
