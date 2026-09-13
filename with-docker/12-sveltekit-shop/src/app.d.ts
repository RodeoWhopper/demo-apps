import type { SafeUser } from "$lib/types";

declare global {
  namespace App {
    interface Locals {
      user: SafeUser | null;
      sessionId: string | null;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
