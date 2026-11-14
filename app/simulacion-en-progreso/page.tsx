import { redirect } from "next/navigation";

// "Simulation in progress" only stacked /simulator and /lab; both now live in /simulator, so this route redirects there.
export default function SimulacionRedirect() {
  redirect("/simulator#fire");
}
