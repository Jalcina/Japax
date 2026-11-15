import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ranking · JaPax",
  description:
    "Rank NASA fire investigations by how relevant they are to a spacesuit, a ship or a lunar habitat, with sliders you control.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
