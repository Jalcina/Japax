"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ImmersiveEnv } from "./ImmersiveScene";
import type { FireParams } from "@/lib/hyperFire";
import { useLang } from "@/lib/i18n";

// three.js and the NASA models are only fetched when a stage is actually shown.
const ImmersiveScene = dynamic(() => import("./ImmersiveScene"), {
  ssr: false,
  loading: () => <div className="h-[44vh] min-h-[300px] w-full rounded-xl border border-white/10 bg-black" aria-hidden="true" />,
});

const CREDIT: Record<ImmersiveEnv, string> = {
  earth: "Earth textures derived from NASA imagery (three.js examples)",
  iss: "ISS (D) (IGOAL), NASA 3D Resources, simplified for the web",
  moon: "Apollo Lunar Module, NASA 3D Resources; procedural terrain",
  mars: "Mars 2020 Perseverance Rover, NASA 3D Resources; procedural terrain",
  suit: "Extravehicular Mobility Unit (EMU), NASA 3D Resources",
};

/** Real 3D place for an environment: orbit with the mouse, zoom with the wheel. */
export default function EnvironmentStage({ env, fire, className = "h-[44vh] min-h-[300px]", onPick, life }: { env: ImmersiveEnv; fire?: FireParams; className?: string; onPick?: (point: [number, number, number]) => void; life?: number | null }) {
  const { lang } = useLang();
  return (
    <figure>
      <ImmersiveScene env={env} fire={fire} className={className} onPick={onPick} life={life} />
      <figcaption className="mt-1.5 text-xs text-muted">
        {lang === "es" ? "Escena 3D: una visualización, no una medición. La forma de la llama sigue la gravedad, el O₂ y el combustible; su aspecto es ilustrativo." : "3D scene: a visualization, not a measurement. The flame shape follows gravity, O₂ and fuel; its look is illustrative."} {CREDIT[env]}.{" "}
        <Link href="/references" className="link">{lang === "es" ? "Fuentes" : "References"}</Link>
      </figcaption>
    </figure>
  );
}
