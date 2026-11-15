import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo · JaPax",
  description:
    "The JaPax 30-second film: Pax explains why fire in space matters and how JaPax turns NASA fire experiments into an answer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
