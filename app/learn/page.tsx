import { redirect } from "next/navigation";

// The introductory "Basics" page was removed: the site targets sector professionals. Old links go Home.
export default function LearnRedirect() {
  redirect("/");
}
