import type { Role } from "@/lib/tickets/status";

// Shared demo accounts behind the role picker on the login screen. Their password
// (DEMO_USER_PASSWORD) only exists on the server. Replace with real sign-in later.
export const DEMO_ACCOUNTS: Record<Role, { email: string; name: string }> = {
  area_leader: { email: "lider@demo.example.com", name: "Anna Nowak" },
  technician: { email: "technik@demo.example.com", name: "Piotr Kowalski" },
  manager: { email: "kierownik@demo.example.com", name: "Marek Wiśniewski" },
};
