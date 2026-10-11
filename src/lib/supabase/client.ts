import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

// Browser client, used for realtime subscriptions. It shares the session cookie
// with the server, so RLS limits the events each user receives.
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return client;
}
