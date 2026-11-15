import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulator · JaPax",
  description:
    "Touch a spacesuit, the ISS or a lunar module and watch a fire spread between components, with every number marked as measured or estimated.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
