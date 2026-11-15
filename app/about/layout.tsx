import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About us · JaPax",
  description:
    "The two people behind JaPax, built for the NASA Space Apps Challenge 2026 (Seville) on the challenge Flame in Freefall.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
