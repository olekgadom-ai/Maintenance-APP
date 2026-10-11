"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

// Re-renders the current page when tickets change, so the board and ticket
// pages stay current without polling. Bursts of events refresh once.
export function LiveRefresh({ ticketId }: { ticketId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    const filter = ticketId ? `id=eq.${ticketId}` : undefined;
    const channel = supabase
      .channel(`tickets:${ticketId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter },
        refresh,
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router, ticketId]);

  return null;
}
