"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/** The guided tour: one stop per page, in a logical learning order. */
export const TOUR = ["/", "/learn", "/history", "/simulator", "/explorer", "/dashboard", "/references"] as const;

interface Ctx {
  on: boolean;
  setOn: (v: boolean) => void;
}
const GuideContext = createContext<Ctx>({ on: false, setOn: () => {} });

export function GuideProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(false);
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    try {
      if (localStorage.getItem("japax-guide") === "1") setOnState(true);
    } catch {}
  }, []);
  const setOn = useCallback((v: boolean) => {
    // A new tour always starts from the beginning, whatever page the visitor is on
    if (v && !on && path !== TOUR[0]) router.push(TOUR[0]);
    setOnState(v);
    try {
      localStorage.setItem("japax-guide", v ? "1" : "0");
    } catch {}
  }, [on, path, router]);
  return <GuideContext.Provider value={{ on, setOn }}>{children}</GuideContext.Provider>;
}

export const useGuide = () => useContext(GuideContext);
