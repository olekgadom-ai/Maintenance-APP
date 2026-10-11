import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { supabaseKey, supabaseUrl } from "./lib/supabase/env";

const handleI18nRouting = createMiddleware(routing);

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  // Locale redirect (e.g. "/" -> "/pl"): let the browser come back with a locale.
  if (response.headers.has("location")) return response;

  // Refresh the Supabase session and pass updated cookies to the browser.
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const [, locale, ...rest] = request.nextUrl.pathname.split("/");
  const path = `/${rest.join("/")}`;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  // Optimistic check only; pages verify the user again and RLS guards the data.
  if (!signedIn && !isPublic)
    return redirectWithCookies(request, response, `/${locale}/login`);
  if (signedIn && isPublic)
    return redirectWithCookies(request, response, `/${locale}`);

  return response;
}

function redirectWithCookies(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // The base path root ("/UR") needs its own entry; otherwise skip API routes,
  // Next internals and files with an extension (icons, manifest).
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
