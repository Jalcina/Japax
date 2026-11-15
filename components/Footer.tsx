"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    a: "JaPax · NASA Space Apps Challenge 2026 · challenge",
    b: "Data from NASA's public",
    c: " repository. See the",
    d: "page for every source and library used.",
    e: "An independent project, not affiliated with or endorsed by NASA. When lives are at stake, an invented number is a danger: every data point shows its source and whether it is measured, reported, estimated or simulated, and anything unverified is marked as pending and never invented.",
    refs: "References",
    about: "About us",
    demo: "Demo",
    ask: "Ask the Oracle",
    method: "Method",
    glossary: "Glossary",
    license: "Original code and design under the Apache 2.0 license. NASA data remains public domain.",
  },
  es: {
    a: "JaPax · NASA Space Apps Challenge 2026 · reto",
    b: "Datos del repositorio público de NASA",
    c: ". Consulta la página de",
    d: "para ver todas las fuentes y bibliotecas utilizadas.",
    e: "Un proyecto independiente, sin afiliación ni respaldo de NASA. Cuando hay vidas en juego, una cifra inventada es un peligro: cada dato muestra su fuente y si es medido, reportado, estimado o simulado, y lo que no está verificado se marca como pendiente y nunca se inventa.",
    refs: "Referencias",
    about: "Sobre nosotros",
    demo: "Demo",
    ask: "Pregunta al Oráculo",
    method: "Método",
    glossary: "Glosario",
    license: "Código y diseño originales bajo licencia Apache 2.0. Los datos de NASA siguen siendo de dominio público.",
  },
};

export default function Footer() {
  const t = useT(T);
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <p>
          {t.a} <em>Flame in Freefall</em>. {t.b}{" "}
          <a className="link" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">
            Physical Sciences Informatics (PSI)
          </a>
          {t.c}{" "}
          <Link className="link" href="/references">
            {t.refs}
          </Link>{" "}
          {t.d}
        </p>
        <p className="mt-2">{t.e}</p>
        <p className="mt-2">
          © 2026 JaPax by Jaime Alcina &amp; Pablo Triguero. {t.license}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <Link className="link" href="/demo">
            {t.demo}
          </Link>
          <Link className="link" href="/ask">
            {t.ask}
          </Link>
          <Link className="link" href="/methodology">
            {t.method}
          </Link>
          <Link className="link" href="/glossary">
            {t.glossary}
          </Link>
          <Link className="link" href="/about">
            {t.about}
          </Link>
        </p>
      </div>
    </footer>
  );
}
