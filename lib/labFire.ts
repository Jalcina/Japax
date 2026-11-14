/**
 * Fire Lab engine: one ignition point on a real 3D surface grows into a spreading fire.
 *
 * HONESTY: this is a SIMULATION. No dataset contains a spread-rate curve. The only anchor is the 9 measured SAFFIRE
 * points in lib/spreadModel.ts (about 1-2.6 mm/s for thin fabric in microgravity at ~21-22 % O2, 20-30 cm/s of flow).
 * Every other environment is scaled from that anchor with simple monotonic factors that are tagged "estimated".
 * Time is shown compressed (time-lapse) so the front is visible; the real-equivalent time is shown next to it.
 */
import * as THREE from "three";
import { createHyperFire, type HyperFire } from "@/lib/hyperFire";
import type { SceneApi } from "@/components/ImmersiveScene";
import { spreadSpeed, type Atm } from "@/lib/labPhysics";

export { spreadSpeed, type Atm };

export type Phase = "idle" | "igniting" | "spreading" | "suppressing" | "out";
/** what the extinguishing plan decided for THIS fire (from lib/fireCases.scenario) */
/** `damp` (0..1) is only used when fate is "unknown": an ESTIMATED dilution effect (no experimental data), never a result */
export interface Plan { active: boolean; fate: "burn" | "extinguish" | "unknown"; delayS: number | null; damp?: number }
export interface LabStats {
  phase: Phase;
  /** wall-clock seconds since ignition */
  simT: number;
  /** real-equivalent seconds the same spread would take at the modelled speed */
  realT: number;
  speedMmS: number;
  speedNote: string;
  frontM: number;
  areaM2: number;
  cells: number;
  flames: number;
  particles: number;
  surfaces: number;
  surfaceName: string;
  intensity: number;
  detected: boolean;
  delayLeftS: number | null;
}

const CELL = 0.06; // m, size of one burned cell on the surface
const MAX_CELLS = 1800;
const MAX_SMOKE = 1400;
const Z = new THREE.Vector3(0, 0, 1);

type Cell = { p: THREE.Vector3; n: THREE.Vector3; born: number; settled: boolean };

export class LabFire {
  private api: SceneApi;
  private root = new THREE.Group();
  private flames: HyperFire[] = [];
  private cells: Cell[] = [];
  private keys = new Set<string>();
  private decal: THREE.InstancedMesh;
  private smoke: THREE.Points;
  private sPos: Float32Array;
  private sVel: Float32Array;
  private sAge: Float32Array;
  private sLife: Float32Array;
  private sN = 0;
  private fresh: number[] = [];
  private targets: THREE.Object3D[] = [];
  private lastOut = false;
  private origin = new THREE.Vector3();
  private normal = new THREE.Vector3(0, 1, 0);
  private t1 = new THREE.Vector3();
  private t2 = new THREE.Vector3();
  private surfaces = new Set<string>();
  private firstName = "";
  private r = 0;
  private emitted = 0;
  private life = 0;
  private phase: Phase = "idle";
  private t = 0;
  private realT = 0;
  private atm: Atm = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0 };
  private material = "fabric";
  private plan: Plan = { active: false, fate: "burn", delayS: null };
  private lapse = 40;
  private reassign = 0;
  private statsT = 0;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private ray = new THREE.Raycaster();
  private speedNow = { mmS: 0, note: "" };
  private mobile = false;
  private smokeCap = MAX_SMOKE;
  onStats: (s: LabStats) => void = () => {};

  constructor(api: SceneApi, opts: { mobile: boolean }) {
    this.api = api;
    this.mobile = opts.mobile;
    this.smokeCap = opts.mobile ? 600 : MAX_SMOKE;
    this.root.name = "lab-fire";
    api.scene.add(this.root);
    api.ignore.push(this.root);

    const geo = new THREE.CircleGeometry(CELL * 0.8, 10);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.decal = new THREE.InstancedMesh(geo, mat, MAX_CELLS);
    this.decal.count = 0;
    this.decal.frustumCulled = false;
    this.decal.renderOrder = 2;
    this.decal.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CELLS * 3), 3);
    this.root.add(this.decal);

    this.sPos = new Float32Array(MAX_SMOKE * 3);
    this.sVel = new Float32Array(MAX_SMOKE * 3);
    this.sAge = new Float32Array(MAX_SMOKE);
    this.sLife = new Float32Array(MAX_SMOKE);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(this.sPos, 3));
    sg.setDrawRange(0, 0);
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const cx = cv.getContext("2d")!;
    const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 64, 64);
    const sm = new THREE.PointsMaterial({ size: 0.34, map: new THREE.CanvasTexture(cv), color: 0x8d8a86, transparent: true, opacity: 0.4, depthWrite: false, sizeAttenuation: true });
    this.smoke = new THREE.Points(sg, sm);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 4;
    this.root.add(this.smoke);

    const n = opts.mobile ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const f = createHyperFire({ scale: i === 0 ? 0.55 : 0.34, mount: "pan", light: i === 0 ? 0.3 : 0, hardware: false });
      f.group.visible = false;
      f.setLife(0);
      this.root.add(f.group);
      this.flames.push(f);
    }
    api.addUpdater((dt, t, cam, px) => this.update(dt, t, cam, px));
    this.setConditions(this.atm, this.material, this.plan, this.lapse);
  }

  setConditions(atm: Atm, material: string, plan: Plan, lapse: number) {
    this.atm = atm;
    this.material = material;
    this.plan = plan;
    this.lapse = lapse;
    this.speedNow = spreadSpeed(atm, material);
    const fire = { g: atm.gravityG, o2: atm.o2, pressureAtm: atm.pressureAtm, fuel: "heptane" as const, fate: "burn" as const, wind: [atm.flowCmS * 0.004, 0, 0] as [number, number, number] };
    for (const f of this.flames) f.set(fire);
  }

  get active() { return this.phase !== "idle"; }

  ignite(point: THREE.Vector3, normal: THREE.Vector3, name: string) {
    this.reset(false);
    this.origin.copy(point);
    this.normal.copy(normal).normalize();
    const a = Math.abs(this.normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    this.t1.crossVectors(this.normal, a).normalize();
    this.t2.crossVectors(this.normal, this.t1).normalize();
    this.targets = [];
    this.api.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !this.skip(o)) this.targets.push(o); });
    this.firstName = name || "surface";
    this.surfaces.add(this.firstName);
    this.addCell(point, normal);
    this.phase = "igniting";
    this.life = 0.15;
  }

  reset(clearStats = true) {
    this.cells.length = 0;
    this.fresh = [];
    this.targets = [];
    this.lastOut = false;
    this.keys.clear();
    this.surfaces.clear();
    this.decal.count = 0;
    this.sN = 0;
    (this.smoke.geometry as THREE.BufferGeometry).setDrawRange(0, 0);
    this.r = 0; this.emitted = 0; this.t = 0; this.realT = 0; this.life = 0;
    this.phase = "idle";
    for (const f of this.flames) { f.group.visible = false; f.setLife(0); }
    if (clearStats) this.emit();
  }

  reignite() {
    if (this.phase === "idle") return;
    this.ignite(this.origin.clone(), this.normal.clone(), this.firstName);
  }

  private addCell(p: THREE.Vector3, n: THREE.Vector3): boolean {
    if (this.cells.length >= MAX_CELLS) return false;
    const k = `${Math.round(p.x / CELL)},${Math.round(p.y / CELL)},${Math.round(p.z / CELL)}`;
    if (this.keys.has(k)) return false;
    this.keys.add(k);
    this.cells.push({ p: p.clone(), n: n.clone().normalize(), born: this.t, settled: false });
    this.fresh.push(this.cells.length - 1);
    return true;
  }

  private skip(o: THREE.Object3D) { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (this.api.ignore.includes(p)) return true; return false; }

  /** the rim grows along the surface: sample points on a ring around the origin and snap each one onto the geometry by ray */
  private growRim(rNew: number) {
    const b = this.biasDir();
    const steps = Math.max(8, Math.round((2 * Math.PI * rNew) / (CELL * 0.9)));
    const budget = this.mobile ? 40 : 80;
    let used = 0;
    for (let i = 0; i < steps && used < budget; i++) {
      const th = ((i + Math.random()) / steps) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      const along = c * b.x + s * b.y;
      // teardrop / downwind elongation: the rim reaches further along the bias direction
      const reach = rNew * (1 + b.k * Math.max(0, along) - 0.25 * b.k * Math.max(0, -along));
      const q = this.origin.clone().addScaledVector(this.t1, c * reach).addScaledVector(this.t2, s * reach);
      this.ray.set(q.clone().addScaledVector(this.normal, 0.5), this.normal.clone().negate());
      this.ray.far = 1.1;
      used++;
      const hit = this.ray.intersectObjects(this.targets, false)[0];
      if (!hit) continue;
      // stay on the same surface: reject hits far from the local plane (edges, other walls)
      if (Math.abs(hit.point.clone().sub(this.origin).dot(this.normal)) > 0.45) continue;
      const nn = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : this.normal.clone();
      if (nn.dot(this.normal) < 0.35) continue;
      if (this.addCell(hit.point, nn)) this.surfaces.add(hit.object.name || hit.object.parent?.name || "surface");
    }
  }

  /** where the fire prefers to go, in the tangent plane (x along t1, y along t2); k = how lopsided */
  private biasDir() {
    const g = Math.min(1, this.atm.gravityG);
    const fl = Math.min(1, this.atm.flowCmS / 30);
    const v = new THREE.Vector3(fl, g, 0);
    const len = v.length();
    if (len < 1e-4) return { x: 0, y: 0, k: 0 };
    v.divideScalar(len);
    return { x: v.dot(this.t1), y: v.dot(this.t2), k: Math.min(0.9, len * 0.9) };
  }

  private emitSmoke(dt: number) {
    if (this.life < 0.05 || !this.cells.length) return;
    const g = this.atm.gravityG;
    // qualitative: more surface burning gives more soot; more in microgravity (PSI-60 hypothesis, reported)
    const rate = Math.min(240, (10 + this.cells.length * 0.5) * this.life * (g < 0.05 ? 1.4 : 1)) * dt;
    let n = Math.floor(rate + Math.random());
    while (n-- > 0 && this.sN < this.smokeCap) {
      const c = this.cells[(Math.random() * this.cells.length) | 0];
      const i = this.sN++;
      this.sPos[i * 3] = c.p.x + (Math.random() - 0.5) * 0.05;
      this.sPos[i * 3 + 1] = c.p.y + (Math.random() - 0.5) * 0.05;
      this.sPos[i * 3 + 2] = c.p.z + (Math.random() - 0.5) * 0.05;
      // 1 g: buoyant plume going up; 0 g: no buoyancy, slow diffusion away from the surface plus the forced flow
      const up = 0.05 + 0.5 * Math.min(1, g);
      const jit = g < 0.05 ? 0.07 : 0.1;
      this.sVel[i * 3] = (Math.random() - 0.5) * jit + this.atm.flowCmS * 0.002 + c.n.x * 0.05;
      this.sVel[i * 3 + 1] = (Math.random() - 0.5) * jit + up + c.n.y * 0.05;
      this.sVel[i * 3 + 2] = (Math.random() - 0.5) * jit + c.n.z * 0.05;
      this.sAge[i] = 0;
      this.sLife[i] = 4 + Math.random() * 5;
    }
  }

  private stepSmoke(dt: number) {
    for (let i = 0; i < this.sN; i++) {
      this.sAge[i] += dt;
      if (this.sAge[i] > this.sLife[i]) {
        const j = --this.sN;
        this.sPos.copyWithin(i * 3, j * 3, j * 3 + 3);
        this.sVel.copyWithin(i * 3, j * 3, j * 3 + 3);
        this.sAge[i] = this.sAge[j];
        this.sLife[i] = this.sLife[j];
        i--;
        continue;
      }
      this.sPos[i * 3] += this.sVel[i * 3] * dt;
      this.sPos[i * 3 + 1] += this.sVel[i * 3 + 1] * dt;
      this.sPos[i * 3 + 2] += this.sVel[i * 3 + 2] * dt;
    }
    const g = this.smoke.geometry as THREE.BufferGeometry;
    g.setDrawRange(0, this.sN);
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private update(dt: number, t: number, cam: THREE.PerspectiveCamera, px: number) {
    for (const f of this.flames) f.update(dt, t, cam, px);
    if (this.phase === "idle") { this.stepSmoke(dt); return; }
    this.t += dt;
    this.realT += dt * this.lapse;

    if (this.phase === "igniting") {
      this.life = Math.min(1, this.life + dt * 0.5);
      if (this.life > 0.6) this.phase = "spreading";
    }
    if (this.plan.active && (this.phase === "spreading" || this.phase === "igniting") && this.plan.fate === "extinguish") this.phase = "suppressing";
    if (this.phase === "suppressing") {
      this.life = Math.max(0, this.life - dt / 3.5); // visual fade only: no dataset gives a suppression time
      if (this.life <= 0) this.phase = "out";
    }
    // a "burn" or "unknown" plan changes nothing here: the fire keeps going and the UI says why

    const damp = this.plan.active && this.plan.fate === "unknown" ? Math.min(0.95, this.plan.damp ?? 0) : 0;
    if (damp > 0 && (this.phase === "spreading" || this.phase === "igniting")) this.life += ((1 - 0.6 * damp) - this.life) * Math.min(1, dt * 0.8);
    const alive = this.phase === "spreading" || this.phase === "igniting";
    const v = alive ? (this.speedNow.mmS / 1000) * this.lapse * (1 - damp) : 0; // m per wall second, time-lapsed
    if (alive && v > 0) {
      this.r += v * dt * (this.phase === "spreading" ? 1 : 0.4);
      if (this.r - this.emitted > CELL * 0.8) { this.growRim(this.r); this.emitted = this.r; }
    } else if (alive) {
      this.life = Math.max(0.12, this.life - dt * 0.05); // starved: stays tiny and dim (BASS: tiny flames lasted > 5 min)
    }
    this.emitSmoke(dt);
    this.stepSmoke(dt);

    const n = this.cells.length;
    this.decal.count = n;
    const m = this.dummy;
    // matrices are written once, when a cell is born
    for (const i of this.fresh) {
      const c = this.cells[i];
      m.position.copy(c.p).addScaledVector(c.n, 0.004);
      m.quaternion.setFromUnitVectors(Z, c.n);
      m.updateMatrix();
      this.decal.setMatrixAt(i, m.matrix);
    }
    const bornNow = this.fresh.length > 0;
    this.fresh.length = 0;
    // colours only change while a cell is hot; once it has cooled (or the fire is out) it is written one last time
    let colorsDirty = false;
    const out = this.phase === "out";
    for (let i = 0; i < n; i++) {
      const c = this.cells[i];
      if (c.settled && !(out && !this.lastOut)) continue;
      const age = this.t - c.born;
      const hot = out ? 0 : Math.max(0, 1 - age / 2.5) * Math.min(1, this.life * 1.5);
      this.color.setRGB(0.05 + 1.9 * hot, 0.035 + 0.55 * hot * hot, 0.03 + 0.05 * hot);
      this.decal.setColorAt(i, this.color);
      colorsDirty = true;
      if (hot === 0 && (out || age > 2.5)) c.settled = true;
    }
    this.lastOut = out;
    if (bornNow) this.decal.instanceMatrix.needsUpdate = true;
    if (colorsDirty && this.decal.instanceColor) this.decal.instanceColor.needsUpdate = true;

    this.reassign -= dt;
    if (this.reassign <= 0 && n) {
      this.reassign = 0.35;
      for (let i = 1; i < this.flames.length; i++) {
        const lo = Math.max(0, n - 40);
        this.flames[i].group.position.copy(this.cells[lo + ((Math.random() * (n - lo)) | 0)].p);
      }
    }
    this.flames[0].group.position.copy(this.origin);
    const grown = Math.min(1, 0.35 + this.r / 0.5);
    this.flames.forEach((f, i) => {
      const on = this.phase !== "out" && (i === 0 || n > i * 6);
      f.group.visible = on;
      f.setLife(on ? this.life * (i === 0 ? grown : 0.85) : 0);
    });

    this.statsT -= dt;
    if (this.statsT <= 0) { this.statsT = 0.2; this.emit(); }
  }

  private emit() {
    const delay = this.plan.delayS;
    this.onStats({
      phase: this.phase,
      simT: this.t,
      realT: this.realT,
      speedMmS: this.phase === "out" || this.phase === "suppressing" ? 0 : this.speedNow.mmS * (1 - (this.plan.active && this.plan.fate === "unknown" ? Math.min(0.95, this.plan.damp ?? 0) : 0)),
      speedNote: this.speedNow.note,
      frontM: this.r,
      areaM2: this.cells.length * CELL * CELL * 0.9,
      cells: this.cells.length,
      flames: this.flames.filter((f) => f.group.visible).length,
      particles: this.sN,
      surfaces: this.surfaces.size,
      surfaceName: this.firstName,
      intensity: this.life,
      detected: this.sN > 25,
      delayLeftS: delay === null || this.phase === "idle" ? null : this.plan.active ? 0 : Math.max(0, delay - this.realT),
    });
  }

  dispose() {
    this.api.scene.remove(this.root);
    const i = this.api.ignore.indexOf(this.root);
    if (i >= 0) this.api.ignore.splice(i, 1);
    for (const f of this.flames) f.dispose();
    this.decal.geometry.dispose();
    (this.decal.material as THREE.Material).dispose();
    this.smoke.geometry.dispose();
    const sm = this.smoke.material as THREE.PointsMaterial;
    sm.map?.dispose();
    sm.dispose();
  }
}
