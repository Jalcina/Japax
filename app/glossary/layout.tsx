import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glossary · JaPax",
  description:
    "Plain-language definitions of the NASA experiments, units and terms used on JaPax: PSI, DOI, NTRS, BASS, SAFFIRE, FLEX, ACME, LUCI, FM2 and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
