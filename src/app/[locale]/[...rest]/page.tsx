import { notFound } from "next/navigation";

// Catch unknown paths inside a locale so they render the localized not-found page.
export default function CatchAll() {
  notFound();
}
