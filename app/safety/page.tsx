import lab from "@/data/lab.json";
import { computed } from "@/lib/oracle";
import SafetyView from "./SafetyView";

export const metadata = {
  title: "Fire Safety Playbook · JaPax",
  description: "What NASA's microgravity combustion data says about preventing, detecting, slowing and extinguishing a fire in space, and what it cannot yet say.",
};

export default function SafetyPage() {
  const c = computed();
  const o2 = lab.bass2.rows.map((r) => r.o2Initial).filter((x): x is number => x != null);
  const stats = {
    flexN: c.flexN,
    ext: c.ext,
    lunarN: c.lunarN,
    lunarExt: c.lunarExt,
    bassN: c.bassN,
    bassMin: Math.min(...o2),
    bassMax: c.bassMax,
    maxCo2: c.maxCo2,
    maxHe: c.maxHe,
  };
  return <SafetyView stats={stats} />;
}
