/**
 * Registry of the environments that have a component catalog. The panel is generic: adding an environment (ISS, lunar module...) is
 * adding its catalog + map here; nothing in the panel names the suit. `energeticOf(catalog)` may be undefined (no energetic component).
 */
import emuCatalog from "../data/components/emu.catalog.json";
import emuMap from "../data/components/emu.map.json";
import issCatalog from "../data/components/iss.catalog.json";
import issMap from "../data/components/iss.map.json";
import issInteriorCatalog from "../data/components/iss-interior.catalog.json";
import issInteriorMap from "../data/components/iss-interior.map.json";
import earthCatalog from "../data/components/earth.catalog.json";
import earthMap from "../data/components/earth.map.json";
import earthPlanetCatalog from "../data/components/earth-planet.catalog.json";
import earthPlanetMap from "../data/components/earth-planet.map.json";
import moonCatalog from "../data/components/moon.catalog.json";
import moonMap from "../data/components/moon.map.json";
import marsCatalog from "../data/components/mars.catalog.json";
import marsMap from "../data/components/mars.map.json";
import type { Catalog, ComponentMap } from "./componentCatalog.ts";

/** `horizonS`: how long the engine looks ahead (simulated seconds). A fire crosses a hatch in minutes to hours, a suit in about a minute. */
export interface EnvBundle { catalog: Catalog; map: ComponentMap; horizonS?: number }

export const COMPONENT_ENVS: Record<string, EnvBundle> = {
  suit: { catalog: emuCatalog as unknown as Catalog, map: emuMap as unknown as ComponentMap },
  iss: { catalog: issCatalog as unknown as Catalog, map: issMap as unknown as ComponentMap, horizonS: 7200 },
  "iss-interior": { catalog: issInteriorCatalog as unknown as Catalog, map: issInteriorMap as unknown as ComponentMap, horizonS: 7200 },
  earth: { catalog: earthCatalog as unknown as Catalog, map: earthMap as unknown as ComponentMap, horizonS: 3600 },
  "earth-planet": { catalog: earthPlanetCatalog as unknown as Catalog, map: earthPlanetMap as unknown as ComponentMap },
  moon: { catalog: moonCatalog as unknown as Catalog, map: moonMap as unknown as ComponentMap, horizonS: 3600 },
  mars: { catalog: marsCatalog as unknown as Catalog, map: marsMap as unknown as ComponentMap, horizonS: 3600 },
};

/** Which catalog describes the scene on screen: the same environment has different scenes in its "site" and "overview" views. */
export function componentEnvKey(env: string, view: "site" | "overview"): string {
  if (env === "iss") return view === "overview" ? "iss" : "iss-interior";
  if (env === "earth") return view === "overview" ? "earth-planet" : "earth";
  return env;
}
