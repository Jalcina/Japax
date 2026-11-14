import { redirect } from "next/navigation";

// The Data Lab is now the "Data" tab of the single experience at /simulator; old links keep working.
export default function LabRedirect() {
  redirect("/simulator#data");
}
