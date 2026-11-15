/**
 * Registry of the environments that have a component catalog. The panel is generic: adding an environment (ISS, lunar module...) is
 * adding its catalog + map here; nothing in the panel names the suit. `energeticOf(catalog)` may be undefined (no energetic component).
 */
import emuCatalog from "../data/components/emu.catalog.json";
import emuMap from "../data/components/emu.map.json";
import issCatalog from "../data/components/iss.catalog.json";
import issMap from "../data/components/iss.map.json";
import type { Catalog, ComponentMap } from "./componentCatalog.ts";

/** `horizonS`: how long the engine looks ahead (simulated seconds). A fire crosses a hatch in minutes to hours, a suit in about a minute. */
export interface EnvBundle { catalog: Catalog; map: ComponentMap; horizonS?: number }

export const COMPONENT_ENVS: Record<string, EnvBundle> = {
  suit: { catalog: emuCatalog as unknown as Catalog, map: emuMap as unknown as ComponentMap },
  iss: { catalog: issCatalog as unknown as Catalog, map: issMap as unknown as ComponentMap, horizonS: 7200 },
};
