import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sources · JaPax",
  description:
    "Every dataset, paper, library and 3D model used by JaPax, with DOI or NTRS id and what each one supports.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
