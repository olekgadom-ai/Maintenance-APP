import { createNavigation } from "next-intl/navigation";
import type { ComponentProps } from "react";
import { routing } from "./routing";

const navigation = createNavigation(routing);

export const { redirect, usePathname, useRouter, getPathname } = navigation;

// No prefetching. The app is served through forgework.space's rewrite, and
// Vercel answers segment-prefetch requests on the main site instead of
// forwarding them, so every prefetch would 404. Navigations fetch on click.
export function Link(props: ComponentProps<typeof navigation.Link>) {
  return <navigation.Link prefetch={false} {...props} />;
}
