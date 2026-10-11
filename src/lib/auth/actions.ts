"use server";

import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/tickets/status";
import { DEMO_ACCOUNTS } from "./demo-accounts";

export type SignInState = { error: "unavailable" | null };

function localeFrom(formData: FormData) {
  const locale = formData.get("locale");
  return typeof locale === "string" && hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;
}

export async function signInAsRole(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const role = formData.get("role") as Role;
  const password = process.env.DEMO_USER_PASSWORD;
  if (!ROLES.includes(role) || !password) return { error: "unavailable" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role].email,
    password,
  });
  if (error) {
    console.error("Demo sign-in failed", role, error.message);
    return { error: "unavailable" };
  }

  redirect(`/${localeFrom(formData)}`);
}

export async function signOut(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${localeFrom(formData)}/login`);
}
