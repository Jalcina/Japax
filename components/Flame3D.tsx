"use client";

import { useEffect, useRef } from "react";
import type { LabelText, Layers, SimStats } from "@/lib/flameEngine";
import { BOX, FlameEngine3D, T3, type Env3, type Params3 } from "@/lib/flameEngine3D";

type TH = typeof import("three");
export type ZoomPreset = "chamber" | "flame" | "molecules";

interface Props {
  params: Params3;
  layers: Layers;
  env: Env3;
  running: boolean;
  speed: number;
  aspect: number;
  labelText: LabelText;
  ariaLabel: string;
  reigniteKey: number;
  autoRotate: boolean;
  resetKey: number;
  cursorAir: boolean;
  zoomReq: { preset: ZoomPreset; n: number };
  onZoom?: (x: number) => void;
  onStats?: (s: SimStats) => void;
  onUnsupported?: () => void;
  className?: string;
}

const ATOM_HEX = { O: 0xe34948, N: 0x3987e5, C: 0x6f6e68, H: 0xf4f2ec, He: 0x8ee8e0, F: 0xeda100, S: 0x2b2a28 } as const;
const AR = { O: 0.044, N: 0.042, C: 0.048, H: 0.029, He: 0.043, F: 0.05, S: 0.042 } as const;
const LO_CAP = 6400;
const HI_CAP = 2600;
const BOND_CAP = 2600;

const LABEL_IDS = ["droplet", "fuelVapor", "zone", "oxygenIn", "products", "plume", "sphere"] as const;
type LabelId = (typeof LABEL_IDS)[number];
const LABEL_SIDE: Record<LabelId, "l" | "r"> = { droplet: "l", fuelVapor: "r", zone: "r", oxygenIn: "l", products: "r", plume: "r", sphere: "l" };

export default function Flame3D({ params, layers, env, running, speed, aspect, labelText, ariaLabel, reigniteKey, autoRotate, resetKey, cursorAir, zoomReq, onZoom, onStats, onUnsupported, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const live = useRef({ params, layers, env, running, speed, autoRotate, cursorAir, onStats, onZoom });
  live.current = { params, layers, env, running, speed, autoRotate, cursorAir, onStats, onZoom };
  const api = useRef<{ reignite: () => void; reset: () => void; setEnv: (e: Env3) => void; dirty: () => void; zoomTo: (p: ZoomPreset) => void } | null>(null);
  const labelEls = useRef<Partial<Record<LabelId, HTMLDivElement | null>>>({});

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};

    const init = async () => {
      const THREE: TH = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const { OutputPass } = await import("three/examples/jsm/postprocessing/OutputPass.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      const { Reflector } = await import("three/examples/jsm/objects/Reflector.js");
      const { createHyperFire } = await import("@/lib/hyperFire");
      const { buildLabDome } = await import("@/lib/labDome");
      if (cancelled) return;

      let renderer: InstanceType<TH["WebGLRenderer"]>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      } catch {
        onUnsupported?.();
        return;
      }
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const canvas = renderer.domElement;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", ariaLabel);
      canvas.className = "block w-full rounded-xl border border-line touch-none";
      host.prepend(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1.6, 0.02, 140);
      const HOME = new THREE.Vector3(1.4, 1.0, 8.8);
      const HOME_T = new THREE.Vector3(0, 0.55, 0);
      const HOME_DIST = HOME.distanceTo(HOME_T);
      camera.position.copy(HOME);
      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(HOME_T);
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.panSpeed = 0.8;
      controls.zoomToCursor = true; // zoom toward whatever the pointer is over: dive in to a single molecule
      controls.zoomSpeed = 1.25;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.2;
      controls.maxDistance = 18;
      controls.autoRotateSpeed = 1.1;
      controls.update();

      /* realistic reflections on atoms and droplet */
      const pmrem = new THREE.PMREMGenerator(renderer);
      // a photo-studio of soft boxes: gives glass, steel and every atom believable highlights
      const studio = new THREE.Scene();
      studio.background = new THREE.Color(0x06080c);
      const softbox = (w: number, hh: number, x: number, y: number, z: number, color: number, power: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        studio.add(m);
      };
      softbox(9, 5, 0, 8, 2, 0xffffff, 7);
      softbox(2.2, 8, -8, 2, 1, 0xffd9b0, 5);
      softbox(2.2, 8, 8, 1, -2, 0xa9c8ff, 4);
      softbox(10, 1.4, 0, -1, -9, 0xdfe9ff, 3);
      softbox(6, 2, 0, 3, 9, 0xffffff, 2);
      const envTex = pmrem.fromScene(studio, 0.02).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.5;

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.6, 0.85);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      /* ---------------- lights ---------------- */
      const ambient = new THREE.AmbientLight(0xffffff, 0.16);
      scene.add(ambient);
      const key = new THREE.DirectionalLight(0xeaf1ff, 1.15);
      key.position.set(-5, 9, 6);
      scene.add(key);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.03;
      const rim = new THREE.DirectionalLight(0x8fb6ff, 0.7);
      rim.position.set(7, 3, -9);
      scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffd6b0, 0.22);
      fill.position.set(6, -1, 8);
      scene.add(fill);

      /* ---------------- chamber, droplet, fiber ---------------- */
      const CH = BOX.yMax - BOX.yMin, CY = (BOX.yMax + BOX.yMin) / 2;
      const steel = new THREE.MeshPhysicalMaterial({ color: 0xb3bcc8, roughness: 0.26, metalness: 1, envMapIntensity: 1.7, clearcoat: 0.25 });
      const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.5, metalness: 0.85, envMapIntensity: 0.7 });
      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xd2e8ff, transparent: true, opacity: 0.07, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
      const chamber = new THREE.Group();
      scene.add(chamber);
      const addC = <T extends InstanceType<TH["Object3D"]>>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); chamber.add(o); return o; };
      // frame: twelve rods and eight corner balls
      const rod = (len: number, axis: "x" | "y" | "z", x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 20), steel);
        if (axis === "x") m.rotation.z = Math.PI / 2;
        if (axis === "z") m.rotation.x = Math.PI / 2;
        m.castShadow = true;
        return addC(m, x, y, z);
      };
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(CH, "y", sx * BOX.x, CY, sz * BOX.z);
      for (const sy of [BOX.yMin, BOX.yMax]) {
        for (const sz of [-1, 1]) rod(BOX.x * 2, "x", 0, sy, sz * BOX.z);
        for (const sx of [-1, 1]) rod(BOX.z * 2, "z", sx * BOX.x, sy, 0);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) addC(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), steel), sx * BOX.x, sy, sz * BOX.z);
      }
      // glass on four sides
      for (const sz of [-1, 1]) addC(new THREE.Mesh(new THREE.PlaneGeometry(BOX.x * 2, CH), glassMat), 0, CY, sz * BOX.z);
      for (const sx of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(BOX.z * 2, CH), glassMat); g.rotation.y = Math.PI / 2; addC(g, sx * BOX.x, CY, 0); }
      // perforated floor plate, base and top plates, bolts
      const perf = document.createElement("canvas");
      perf.width = perf.height = 128;
      const pc = perf.getContext("2d")!;
      pc.fillStyle = "#808080"; pc.fillRect(0, 0, 128, 128);
      pc.fillStyle = "#202020";
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { pc.beginPath(); pc.arc(8 + i * 16, 8 + j * 16, 3.2, 0, Math.PI * 2); pc.fill(); }
      const perfTex = new THREE.CanvasTexture(perf);
      perfTex.wrapS = perfTex.wrapT = THREE.RepeatWrapping;
      perfTex.repeat.set(9, 7);
      const floorPlate = new THREE.Mesh(new THREE.BoxGeometry(BOX.x * 2 - 0.1, 0.05, BOX.z * 2 - 0.1), new THREE.MeshStandardMaterial({ color: 0x59616d, roughness: 0.38, metalness: 0.95, bumpMap: perfTex, bumpScale: 2.4, envMapIntensity: 1.4 }));
      floorPlate.receiveShadow = true;
      addC(floorPlate, 0, BOX.yMin + 0.03, 0);
      const base = new THREE.Mesh(new RoundedBoxGeometry(BOX.x * 2 + 1.0, 0.3, BOX.z * 2 + 1.0, 4, 0.08), darkSteel);
      base.castShadow = base.receiveShadow = true;
      addC(base, 0, BOX.yMin - 0.15, 0);
      const top = new THREE.Mesh(new RoundedBoxGeometry(BOX.x * 2 + 0.5, 0.2, BOX.z * 2 + 0.5, 4, 0.06), darkSteel);
      top.castShadow = true;
      addC(top, 0, BOX.yMax + 0.1, 0);
      addC(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.3, 40), steel), 0, BOX.yMax + 0.35, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const k of [0, 1]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6), steel);
        addC(bolt, sx * (BOX.x + 0.28 - k * 0.45), BOX.yMin + 0.01, sz * (BOX.z + 0.28 - k * 0.45));
      }
      // the surrounding facility: dome, fan with HEPA intake, particle counters, hood, racks, gas supply, camera
      const lab = buildLabDome();
      scene.add(lab.group);

      const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe6f2, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, emissive: 0x222a38, emissiveIntensity: 0.3 });
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 48, 32), dropMat);
      scene.add(droplet);
      const fiber = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 2.6, 6), new THREE.MeshBasicMaterial({ color: 0xc8c6be, transparent: true, opacity: 0.55 }));
      fiber.rotation.z = Math.PI / 2 - 0.4;
      scene.add(fiber);

      /* ---------------- hyper-real flame: ray-marched volume + smoke + embers, driven by the engine ---------------- */
      const hf = createHyperFire({ mount: "droplet", hardware: false, light: 0.38 });
      scene.add(hf.group);

      /* ---------------- atoms (two levels of detail, per-instance colour) and bonds ---------------- */
      const atomMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1.6, sheen: 0.35, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.45 });
      const mkAtoms = (seg: [number, number], cap: number) => {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, seg[0], seg[1]), atomMat, cap);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.setColorAt(0, new THREE.Color(1, 1, 1));
        (m.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).setUsage(THREE.DynamicDrawUsage);
        m.count = 0;
        m.frustumCulled = false;
        scene.add(m);
        return m;
      };
      const atomsLo = mkAtoms([10, 8], LO_CAP);
      const atomsHi = mkAtoms([26, 18], HI_CAP);
      const loM = atomsLo.instanceMatrix.array as Float32Array;
      const loC = (atomsLo.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).array as Float32Array;
      const hiM = atomsHi.instanceMatrix.array as Float32Array;
      const hiC = (atomsHi.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).array as Float32Array;
      let nLo = 0, nHi = 0;

      const bondMat = new THREE.MeshPhysicalMaterial({ color: 0xd9d7d0, roughness: 0.22, metalness: 0.55, clearcoat: 0.5, envMapIntensity: 1.5 });
      const bonds = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 9, 1, true), bondMat, BOND_CAP);
      bonds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      bonds.count = 0;
      bonds.frustumCulled = false;
      scene.add(bonds);
      const bondM = bonds.instanceMatrix.array as Float32Array;
      let nBond = 0;

      const lin = (hex: number) => {
        const c = new THREE.Color(hex);
        return [c.r, c.g, c.b] as const;
      };
      const COL = { O: lin(ATOM_HEX.O), N: lin(ATOM_HEX.N), C: lin(ATOM_HEX.C), H: lin(ATOM_HEX.H), He: lin(ATOM_HEX.He), F: lin(ATOM_HEX.F), S: lin(ATOM_HEX.S) };

      const camP = camera.position;
      let boost = 1;
      const putAtom = (x: number, y: number, z: number, s: number, c: readonly [number, number, number], heat = 0) => {
        const dx = x - camP.x, dy = y - camP.y, dz = z - camP.z;
        const near = dx * dx + dy * dy + dz * dz < 9;
        const rs = s * boost;
        let r = c[0], g = c[1], b = c[2];
        if (heat > 0.01) {
          // hot products glow orange and cool down: over-bright values feed the bloom
          r = r * (1 - 0.8 * heat) + 2.6 * heat;
          g = g * (1 - 0.8 * heat) + 0.55 * heat;
          b = b * (1 - 0.8 * heat) + 0.08 * heat;
        }
        if (near) {
          if (nHi >= HI_CAP) return;
          const o = nHi * 16, k = nHi * 3;
          hiM[o] = rs; hiM[o + 5] = rs; hiM[o + 10] = rs; hiM[o + 12] = x; hiM[o + 13] = y; hiM[o + 14] = z; hiM[o + 15] = 1;
          hiC[k] = r; hiC[k + 1] = g; hiC[k + 2] = b;
          nHi++;
        } else {
          if (nLo >= LO_CAP) return;
          const o = nLo * 16, k = nLo * 3;
          loM[o] = rs; loM[o + 5] = rs; loM[o + 10] = rs; loM[o + 12] = x; loM[o + 13] = y; loM[o + 14] = z; loM[o + 15] = 1;
          loC[k] = r; loC[k + 1] = g; loC[k + 2] = b;
          nLo++;
        }
      };
      const putBond = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, rad: number) => {
        if (nBond >= BOND_CAP) return;
        let dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
        const len = Math.hypot(dx, dy, dz);
        if (len < 1e-5) return;
        dx /= len; dy /= len; dz /= len;
        let ux: number, uy: number, uz: number;
        if (Math.abs(dy) < 0.9) { ux = -dz; uy = 0; uz = dx; } else { ux = 0; uy = dz; uz = -dy; }
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
        const o = nBond * 16;
        bondM[o] = ux * rad; bondM[o + 1] = uy * rad; bondM[o + 2] = uz * rad;
        bondM[o + 4] = dx * len; bondM[o + 5] = dy * len; bondM[o + 6] = dz * len;
        bondM[o + 8] = vx * rad; bondM[o + 9] = vy * rad; bondM[o + 10] = vz * rad;
        bondM[o + 12] = (x1 + x2) / 2; bondM[o + 13] = (y1 + y2) / 2; bondM[o + 14] = (z1 + z2) / 2; bondM[o + 15] = 1;
        nBond++;
      };

      /* ---------------- airflow arrows ---------------- */
      const arrowGroup = new THREE.Group();
      const arrows: InstanceType<TH["ArrowHelper"]>[] = [];
      for (let i = 0; i < 9; i++) {
        const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.5, 0x8ac8ff, 0.14, 0.09);
        a.visible = false;
        arrows.push(a);
        arrowGroup.add(a);
      }
      scene.add(arrowGroup);
      const cursorArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffd36b, 0.22, 0.14);
      cursorArrow.visible = false;
      scene.add(cursorArrow);

      /* ---------------- test cell: identical scenery for every environment, only the physics changes ---------------- */
      const uniformsToAnimate: { value: number }[] = [];
      const tickers: ((dt: number, t: number) => void)[] = [];
      let tickT = 0;
      let envBuilt = false;
      const buildEnv = (e: Env3) => {
        void e;
        if (envBuilt) return;
        envBuilt = true;
        scene.background = new THREE.Color(0x06080c);
        scene.fog = new THREE.FogExp2(0x06080c, 0.016);
        scene.environmentIntensity = 0.95;
        controls.maxPolarAngle = Math.PI * 0.52;
        controls.maxDistance = 22;
        HOME.set(2.4, 1.4, 11.2);
        HOME_T.set(0, 0.4, 0);
        camera.position.copy(HOME);
        controls.target.copy(HOME_T);
        controls.update();
        camera.far = 220;
        camera.updateProjectionMatrix();
        // soft vertical gradient behind everything
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(90, 32, 16),
          new THREE.ShaderMaterial({
            uniforms: { uTop: { value: new THREE.Color(0x0a0e15) }, uMid: { value: new THREE.Color(0x121a25) }, uBot: { value: new THREE.Color(0x05070a) } },
            vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
            fragmentShader: "uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.7, h)) : mix(uMid, uBot, smoothstep(0.0, -0.35, h)); gl_FragColor = vec4(c, 1.0); }",
            side: THREE.BackSide, depthWrite: false, fog: false,
          }),
        );
        scene.add(dome);
        // polished floor: a real planar mirror under a dark glossy sheet that fades the reflection with distance
        const floorY = BOX.yMin - 0.3;
        const mirror = new Reflector(new THREE.CircleGeometry(60, 72), { clipBias: 0.003, textureWidth: 640, textureHeight: 640, color: 0x6c7685 });
        mirror.rotation.x = -Math.PI / 2;
        mirror.position.y = floorY;
        scene.add(mirror);
        const sheen = new THREE.Mesh(
          new THREE.CircleGeometry(60, 72).rotateX(-Math.PI / 2),
          new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
            fragmentShader: "varying vec3 vW; void main(){ float r = length(vW.xz); float a = mix(0.62, 0.97, smoothstep(2.0, 16.0, r)); gl_FragColor = vec4(0.015, 0.02, 0.03, a); }",
          }),
        );
        sheen.position.y = floorY + 0.004;
        scene.add(sheen);
        // a faint lit pad of the floor right under the chamber, so the flame's light and the key light land on something
        const lit = new THREE.Mesh(new THREE.CircleGeometry(9, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.55, envMapIntensity: 1.2 }));
        lit.position.y = floorY + 0.008;
        lit.receiveShadow = true;
        scene.add(lit);
      };
      buildEnv(live.current.env);

      /* ---------------- labels: DOM chips projected every frame, de-overlapped ---------------- */
      const proj = new THREE.Vector3();
      type LItem = { id: LabelId; x: number; y: number; w: number; h: number };
      const sizeCache = new Map<LabelId, { w: number; h: number }>();
      const measure = (id: LabelId, el: HTMLDivElement) => {
        let s = sizeCache.get(id);
        if (!s || s.w === 0) {
          s = { w: el.offsetWidth || 100, h: el.offsetHeight || 22 };
          sizeCache.set(id, s);
        }
        return s;
      };
      const layoutLabels = (items: { id: LabelId; wx: number; wy: number; wz: number; show: boolean }[], W: number, H: number) => {
        const placed: LItem[] = [];
        for (const it of items) {
          const el = labelEls.current[it.id];
          if (!el) continue;
          if (!it.show) { el.style.display = "none"; continue; }
          proj.set(it.wx, it.wy, it.wz).project(camera);
          if (proj.z > 1) { el.style.display = "none"; continue; }
          el.style.display = "flex";
          const { w, h } = measure(it.id, el);
          placed.push({ id: it.id, x: ((proj.x + 1) / 2) * W, y: ((1 - proj.y) / 2) * H, w, h });
        }
        // push labels apart vertically when their text boxes collide
        placed.sort((a, b) => a.y - b.y);
        const boxes: { x0: number; x1: number; y: number; h: number }[] = [];
        for (const p of placed) {
          const left = LABEL_SIDE[p.id] === "l";
          const x0 = left ? p.x - p.w - 14 : p.x + 4;
          const x1 = x0 + p.w;
          let y = p.y;
          for (let pass = 0; pass < 6; pass++) {
            let moved = false;
            for (const b of boxes) {
              if (x0 < b.x1 + 4 && x1 > b.x0 - 4 && Math.abs(y - b.y) < (p.h + b.h) / 2 + 2) {
                y = b.y + (p.h + b.h) / 2 + 3;
                moved = true;
              }
            }
            if (!moved) break;
          }
          boxes.push({ x0, x1, y, h: p.h });
          const el = labelEls.current[p.id]!;
          el.style.transform = `translate(${p.x}px, ${y}px)`;
        }
      };

      /* ---------------- engine ---------------- */
      const eng = new FlameEngine3D();
      eng.setParams(live.current.params);
      eng.warmup(2.5);
      let dirty = true;

      /* camera tween between zoom presets */
      let hfT = 0;
      let tween: { t0: number; dur: number; p0: InstanceType<TH["Vector3"]>; p1: InstanceType<TH["Vector3"]>; q0: InstanceType<TH["Vector3"]>; q1: InstanceType<TH["Vector3"]> } | null = null;
      const zoomTo = (preset: ZoomPreset) => {
        const dir = camera.position.clone().sub(controls.target);
        if (dir.length() < 1e-3) dir.set(0.15, 0.1, 1);
        dir.normalize();
        const R = eng.rf, zy = eng.zoneY;
        const tgt = preset === "chamber" ? HOME_T.clone() : preset === "flame" ? new THREE.Vector3(0, zy + 0.05, 0) : new THREE.Vector3(R * 0.95, zy, 0.25);
        const dist = preset === "chamber" ? HOME.distanceTo(HOME_T) : preset === "flame" ? 3.6 : 0.85;
        tween = { t0: performance.now(), dur: 950, p0: camera.position.clone(), p1: tgt.clone().add(dir.multiplyScalar(dist)), q0: controls.target.clone(), q1: tgt };
        dirty = true;
      };

      api.current = {
        reignite: () => eng.reignite(),
        reset: () => {
          tween = null;
          camera.position.copy(HOME);
          controls.target.copy(HOME_T);
          controls.update();
          dirty = true;
        },
        setEnv: (e) => {
          buildEnv(e);
          dirty = true;
        },
        dirty: () => {
          dirty = true;
        },
        zoomTo,
      };
      controls.addEventListener("change", () => (dirty = true));
      controls.addEventListener("start", () => (tween = null));

      /* ---------------- sizing ---------------- */
      let quality = window.matchMedia("(pointer: coarse)").matches ? 1 : 2;
      const applyQuality = () => {
        const dpr = window.devicePixelRatio || 1;
        renderer.setPixelRatio(quality === 2 ? Math.min(1.5, dpr) : 1);
        bloom.enabled = quality > 0;
      };
      let W = 800, H = 500;
      const aspectRef = { current: aspect };
      const fit = () => {
        W = Math.max(280, Math.floor(host.clientWidth));
        H = Math.floor(W * aspectRef.current);
        applyQuality();
        renderer.setSize(W, H, false);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        composer.setPixelRatio(renderer.getPixelRatio());
        composer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        dirty = true;
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(host);
      let visible = true;
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.02 });
      io.observe(host);

      /* ---------------- "air from the cursor" ---------------- */
      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane();
      const hit = new THREE.Vector3();
      const ndc = new THREE.Vector2();
      const fwd = new THREE.Vector3();
      const onMove = (ev: PointerEvent) => {
        if (!live.current.cursorAir || ev.buttons !== 0) {
          if (eng.windOverride) { eng.windOverride = null; cursorArrow.visible = false; }
          return;
        }
        const r = canvas.getBoundingClientRect();
        ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        camera.getWorldDirection(fwd);
        plane.setFromNormalAndCoplanarPoint(fwd, new THREE.Vector3(0, 0.2, 0));
        if (!ray.ray.intersectPlane(plane, hit)) return;
        const d = new THREE.Vector3(0, 0.2, 0).sub(hit);
        const len = d.length();
        if (len < 0.5) return;
        d.normalize();
        eng.windOverride = { dir: [d.x, d.y, d.z], cmS: Math.max(live.current.params.flowCmS, 28) };
        cursorArrow.visible = true;
        cursorArrow.position.copy(hit);
        cursorArrow.setDirection(d);
        cursorArrow.setLength(Math.min(len * 0.55, 2.4), 0.22, 0.14);
        dirty = true;
      };
      const onLeave = () => {
        eng.windOverride = null;
        cursorArrow.visible = false;
        dirty = true;
      };
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);

      /* ---------------- loop ---------------- */
      let raf = 0;
      let last = performance.now();
      let statAcc = 0;
      let slow = 0;
      let frames = 0;
      let timeAcc = 0;
      const tmp = new THREE.Vector3();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const dtMs = now - last;
        const dt = Math.min(0.05, dtMs / 1000);
        last = now;
        if (!visible || document.hidden) return;
        const L = live.current;
        controls.autoRotate = L.autoRotate;
        if (L.running) {
          eng.setParams(L.params);
          eng.step(dt * L.speed);
          dirty = true;
        } else eng.params = L.params;
        if (L.autoRotate) dirty = true;

        if (tween) {
          const k = Math.min(1, (now - tween.t0) / tween.dur);
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          camera.position.lerpVectors(tween.p0, tween.p1, e);
          controls.target.lerpVectors(tween.q0, tween.q1, e);
          if (k >= 1) tween = null;
          dirty = true;
        }
        // keep the orbit target inside the chamber so panning cannot lose the scene
        controls.target.x = Math.max(-BOX.x, Math.min(BOX.x, controls.target.x));
        controls.target.y = Math.max(BOX.yMin, Math.min(BOX.yMax, controls.target.y));
        controls.target.z = Math.max(-BOX.z, Math.min(BOX.z, controls.target.z));
        controls.update();
        if (!dirty) return;
        dirty = false;

        const P = eng.params;
        const g = Math.min(1, P.gravityG);
        const Ly = L.layers;
        const wdir = eng.windOverride?.dir ?? P.wind ?? [1, 0, 0];
        const wflow = eng.windOverride?.cmS ?? P.flowCmS;
        const camDist = camera.position.distanceTo(controls.target);
        boost = Math.max(1, Math.min(1.9, camDist / 5.5));

        // flame: the hyper-real volume takes its size, place and life from the same engine that moves the molecules
        if (tickers.length) { tickT += dt; for (const f of tickers) f(dt, tickT); dirty = true; }
        lab.update(dt, { o2: P.o2, pressureAtm: P.pressureAtm, g: P.gravityG, flowK: Math.min(1, wflow / 40), fuel: P.fuel, intensity: Math.min(1, eng.intensity) });
        hf.set({ g: P.gravityG, o2: P.o2, pressureAtm: P.pressureAtm, fuel: P.fuel, fate: P.fate, wind: [wdir[0] * Math.min(1, wflow / 40), wdir[1] * Math.min(1, wflow / 40), wdir[2] * Math.min(1, wflow / 40)] });
        hf.setLife(Math.min(1, eng.intensity));
        hf.setPose(Math.max(0.2, eng.rf * 1.05), eng.zoneY, 0);
        hf.group.visible = Ly.flame;
        hfT += L.running ? dt * L.speed : 0;
        hf.update(L.running ? dt * L.speed : 0, hfT, camera, renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360)));
        dropMat.color.set(P.fuel === "heptane" ? 0xe0b84a : 0xdfe6f2);

        // molecules
        nLo = 0; nHi = 0; nBond = 0;
        const n = eng.n;
        const ex = eng.x, ey = eng.y, ez = eng.z, eax = eng.ax, eay = eng.ay, eaz = eng.az, et = eng.type, ep = eng.prod, elf = eng.life;
        const heptane = P.fuel === "heptane";
        for (let i = 0; i < n; i++) {
          const ty = et[i];
          const x = ex[i], y = ey[i], z = ez[i];
          const ax = eax[i], ay = eay[i], az = eaz[i];
          switch (ty) {
            case T3.O2: {
              if (!Ly.o2) break;
              const x1 = x + ax * 0.05, y1 = y + ay * 0.05, z1 = z + az * 0.05, x2 = x - ax * 0.05, y2 = y - ay * 0.05, z2 = z - az * 0.05;
              putAtom(x1, y1, z1, AR.O, COL.O); putAtom(x2, y2, z2, AR.O, COL.O);
              putBond(x1, y1, z1, x2, y2, z2, 0.014);
              break;
            }
            case T3.N2: {
              if (!Ly.n2) break;
              const x1 = x + ax * 0.05, y1 = y + ay * 0.05, z1 = z + az * 0.05, x2 = x - ax * 0.05, y2 = y - ay * 0.05, z2 = z - az * 0.05;
              putAtom(x1, y1, z1, AR.N, COL.N); putAtom(x2, y2, z2, AR.N, COL.N);
              putBond(x1, y1, z1, x2, y2, z2, 0.017);
              break;
            }
            case T3.CO2: {
              const isProd = ep[i] === 1;
              if (isProd ? !Ly.products : !Ly.co2) break;
              const heat = isProd ? Math.exp(-(9 - Math.max(0, elf[i])) / 1.3) : 0;
              const x1 = x + ax * 0.115, y1 = y + ay * 0.115, z1 = z + az * 0.115, x2 = x - ax * 0.115, y2 = y - ay * 0.115, z2 = z - az * 0.115;
              putAtom(x, y, z, AR.C, COL.C, heat);
              putAtom(x1, y1, z1, 0.042, COL.O, heat); putAtom(x2, y2, z2, 0.042, COL.O, heat);
              putBond(x, y, z, x1, y1, z1, 0.013); putBond(x, y, z, x2, y2, z2, 0.013);
              break;
            }
            case T3.HE:
              if (!Ly.he) break;
              putAtom(x, y, z, AR.He, COL.He);
              break;
            case T3.H2O: {
              if (!Ly.products) break;
              const heat = Math.exp(-(9 - Math.max(0, elf[i])) / 1.3);
              // bent molecule: build a perpendicular to the axis
              let px = -az, py = 0, pz = ax;
              let pl = Math.hypot(px, py, pz);
              if (pl < 0.2) { px = 0; py = az; pz = -ay; pl = Math.hypot(px, py, pz) || 1; }
              px /= pl; py /= pl; pz /= pl;
              const c = 0.616 * 0.082, s = 0.788 * 0.082;
              const h1x = x + ax * c + px * s, h1y = y + ay * c + py * s, h1z = z + az * c + pz * s;
              const h2x = x + ax * c - px * s, h2y = y + ay * c - py * s, h2z = z + az * c - pz * s;
              putAtom(x, y, z, 0.044, COL.O, heat);
              putAtom(h1x, h1y, h1z, AR.H, COL.H, heat); putAtom(h2x, h2y, h2z, AR.H, COL.H, heat);
              putBond(x, y, z, h1x, h1y, h1z, 0.01); putBond(x, y, z, h2x, h2y, h2z, 0.01);
              break;
            }
            case T3.FUEL:
              if (!Ly.fuel) break;
              if (heptane) {
                const x1 = x - ax * 0.1, y1 = y - ay * 0.1, z1 = z - az * 0.1, x2 = x + ax * 0.1, y2 = y + ay * 0.1, z2 = z + az * 0.1;
                putAtom(x1, y1, z1, 0.046, COL.F); putAtom(x, y, z, 0.05, COL.F); putAtom(x2, y2, z2, 0.046, COL.F);
                putBond(x1, y1, z1, x, y, z, 0.013); putBond(x, y, z, x2, y2, z2, 0.013);
              } else {
                const x1 = x - ax * 0.05, y1 = y - ay * 0.05, z1 = z - az * 0.05, x2 = x + ax * 0.05, y2 = y + ay * 0.05, z2 = z + az * 0.05;
                putAtom(x1, y1, z1, AR.F, COL.F); putAtom(x2, y2, z2, AR.F, COL.F);
                putBond(x1, y1, z1, x2, y2, z2, 0.014);
              }
              break;
            case T3.SOOT: {
              if (!Ly.soot) break;
              // soot is a small aggregate of carbon spheres, glowing while it is hot
              const heat = Math.exp(-(11 - Math.max(0, elf[i])) / 1.8);
              putAtom(x, y, z, 0.045, COL.S, heat);
              putAtom(x + ay * 0.06, y - ax * 0.05, z + az * 0.03, 0.038, COL.S, heat);
              putAtom(x - az * 0.05, y + az * 0.04, z + ax * 0.05, 0.034, COL.S, heat);
              break;
            }
          }
        }
        atomsLo.count = nLo; atomsHi.count = nHi; bonds.count = nBond;
        atomsLo.instanceMatrix.needsUpdate = true; atomsHi.instanceMatrix.needsUpdate = true; bonds.instanceMatrix.needsUpdate = true;
        (atomsLo.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).needsUpdate = true;
        (atomsHi.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).needsUpdate = true;
        bonds.visible = camDist < 6.5;

        // arrows: forced airflow (blue) and buoyant convection (blue, rising)
        let ai = 0;
        const flowOn = Ly.flow && wflow > 0.5;
        const upOn = Ly.flow && g > 0.02;
        for (let r = 0; r < 4 && flowOn; r++) {
          for (let c = 0; c < 2; c++) {
            const a = arrows[ai++];
            if (!a) break;
            const phase = ((hfT * wflow * 0.012 + r * 0.31 + c * 0.5) % 1 + 1) % 1;
            const base = tmp.set(wdir[0], wdir[1], wdir[2]).multiplyScalar(-2.6 + phase * 3.4);
            a.position.set(base.x + (c ? 0.6 : -0.5), base.y - 1.2 + r * 0.8, base.z + (r % 2 ? 0.8 : -0.8));
            a.setDirection(new THREE.Vector3(wdir[0], wdir[1], wdir[2]));
            a.setLength(0.55 + Math.min(0.6, wflow * 0.012), 0.14, 0.09);
            a.visible = true;
          }
        }
        for (let k = 0; k < 3 && upOn; k++) {
          const a = arrows[ai++];
          if (!a) break;
          const phase = ((hfT * (0.5 + g) * 0.5 + k * 0.33) % 1 + 1) % 1;
          a.position.set((k - 1) * 0.35, 0.5 + phase * 2.4, 0);
          a.setDirection(new THREE.Vector3(0, 1, 0));
          a.setLength(0.4 + 0.5 * g, 0.12, 0.08);
          a.visible = true;
        }
        for (; ai < arrows.length; ai++) arrows[ai].visible = false;

        // labels
        const burning = eng.intensity > 0.15;
        const R = eng.rf, zy = eng.zoneY;
        const sL = Ly.labels && camDist > 1.6;
        layoutLabels(
          [
            { id: "droplet", wx: -0.12, wy: -0.3, wz: 0, show: sL },
            { id: "fuelVapor", wx: 0.34, wy: -0.3, wz: 0.15, show: sL && burning && Ly.fuel },
            { id: "zone", wx: R * 0.72, wy: zy + R * 0.55, wz: 0, show: sL && burning && Ly.flame },
            { id: "oxygenIn", wx: -R * 1.3, wy: zy + R * 0.55, wz: 0, show: sL && burning && Ly.o2 },
            { id: "products", wx: g > 0.3 ? R * 0.5 : R * 1.1, wy: g > 0.3 ? zy + R * 1.7 : zy - R * 0.6, wz: g > 0.3 ? 0 : R * 0.4, show: sL && burning && Ly.products },
            { id: "plume", wx: 0, wy: zy + R * 2.3, wz: 0, show: sL && burning && g > 0.3 },
            { id: "sphere", wx: -R * 0.7, wy: zy + R * 0.95, wz: 0, show: sL && burning && g < 0.03 },
          ],
          W,
          H,
        );

        for (const u of uniformsToAnimate) u.value += dt;
        composer.render();

        // adaptive quality: drop detail if the machine struggles
        timeAcc += dtMs;
        frames++;
        if (frames >= 60) {
          const avg = timeAcc / frames;
          if (avg > 36 && quality > 0) {
            slow++;
            if (slow >= 2) { quality--; slow = 0; fit(); }
          } else slow = 0;
          frames = 0;
          timeAcc = 0;
        }

        statAcc += dt;
        if (statAcc > 0.25) {
          statAcc = 0;
          L.onStats?.(eng.stats());
          L.onZoom?.(HOME_DIST / Math.max(0.05, camDist));
        }
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        controls.dispose();
        scene.traverse((o) => {
          const m = o as InstanceType<TH["Mesh"]>;
          m.geometry?.dispose?.();
          const mat = m.material as InstanceType<TH["Material"]> | InstanceType<TH["Material"]>[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        });
        envTex.dispose();
        pmrem.dispose();
        composer.dispose();
        renderer.dispose();
        renderer.forceContextLoss(); // give the GPU context back now; dispose() alone leaves it alive until GC
        canvas.remove();
        api.current = null;
      };
    };

    // build the scene only when the view is (nearly) on screen: pages with the flame below the fold stay light
    const starter = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          starter.disconnect();
          void init();
        }
      },
      { rootMargin: "300px" },
    );
    starter.observe(host);

    return () => {
      cancelled = true;
      starter.disconnect();
      cleanup();
    };
    // the scene is created once; props are read through refs and the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  useEffect(() => api.current?.dirty(), [params, layers, labelText]);
  useEffect(() => api.current?.setEnv(env), [env]);
  useEffect(() => {
    if (reigniteKey) api.current?.reignite();
  }, [reigniteKey]);
  useEffect(() => {
    if (resetKey) api.current?.reset();
  }, [resetKey]);
  useEffect(() => {
    if (zoomReq.n) api.current?.zoomTo(zoomReq.preset);
  }, [zoomReq]);

  const tag = (id: LabelId, text: string, color: string) => (
    <div
      key={id}
      ref={(el) => {
        labelEls.current[id] = el;
      }}
      className="pointer-events-none absolute left-0 top-0 hidden items-center"
      style={{ willChange: "transform" }}
    >
      <span className="h-1.5 w-1.5 shrink-0 -translate-x-1/2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span
        className={`whitespace-nowrap rounded-md border border-line bg-bg/75 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur ${LABEL_SIDE[id] === "l" ? "-translate-x-[calc(100%+10px)]" : "translate-x-1.5"}`}
        style={{ color }}
      >
        {text}
      </span>
    </div>
  );

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
        {tag("droplet", labelText.droplet, "#eceae4")}
        {tag("fuelVapor", labelText.fuelVapor, "#ffd36b")}
        {tag("zone", labelText.zone, "#ffb98a")}
        {tag("oxygenIn", labelText.oxygenIn, "#ff9d9c")}
        {tag("products", labelText.products, "#e9e7e0")}
        {tag("plume", labelText.plume, "#8ac8ff")}
        {tag("sphere", labelText.sphere, "#8ac8ff")}
      </div>
    </div>
  );
}
