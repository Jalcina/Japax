import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chronology · JaPax",
  description:
    "A timeline of fire in space, from Apollo 1 to today, with the source of every event.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
