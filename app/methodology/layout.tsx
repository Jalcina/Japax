import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Method · JaPax",
  description:
    "How JaPax labels every number as measured, reported, estimated or simulated, how the simulator computes spread, and what the NASA data cannot say yet.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
