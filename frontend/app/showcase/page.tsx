import { redirect } from "next/navigation";

/** Alias for /demo */
export default function ShowcaseRedirectPage() {
  redirect("/demo");
}
