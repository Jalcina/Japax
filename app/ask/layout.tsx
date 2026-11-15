import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask Pax · JaPax",
  description:
    "Ask Pax, an AI grounded in the JaPax evidence base, about fire in space: oxygen, materials, smoke and what NASA has measured.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
