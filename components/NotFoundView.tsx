"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    title: "This page does not exist",
    text: "No fire here, only a wrong address. Try the simulator or go back to the start.",
    home: "Home",
    sim: "Simulator",
    refs: "References",
  },
  es: {
    title: "Esta página no existe",
    text: "Aquí no hay fuego, solo una dirección equivocada. Prueba el simulador o vuelve al inicio.",
    home: "Inicio",
    sim: "Simulador",
    refs: "Referencias",
  },
};

export default function NotFoundView() {
  const t = useT(T);
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-sm text-muted">404</p>
      <h1 className="mt-2 text-3xl font-semibold">{t.title}</h1>
      <p className="mt-3 text-muted">{t.text}</p>
      <p className="mt-6 flex justify-center gap-6">
        <Link className="link" href="/">{t.home}</Link>
        <Link className="link" href="/simulator">{t.sim}</Link>
        <Link className="link" href="/references">{t.refs}</Link>
      </p>
    </div>
  );
}
