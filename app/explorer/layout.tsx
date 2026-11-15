import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investigations · JaPax",
  description:
    "Browse the 19 NASA fire investigations from the PSI archive, each with its DOI, files and measured conditions.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
