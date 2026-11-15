import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meet Pax · JaPax",
  description:
    "Meet Pax, the JaPax mentor: character sheet with expressions, palette and sizes.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
