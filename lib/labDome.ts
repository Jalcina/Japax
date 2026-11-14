/**
 * LabDome: the facility that surrounds the combustion chamber.
 * A panelled dome with steel ribs and light strips, and around the chamber the equipment a real fire-safety
 * test cell has: an industrial axial fan with HEPA intake, particle counters with sampling lines, a smoke-extraction
 * hood, instrument racks with live read-outs, gas cylinders with regulators and piped supply lines, a high-speed camera
 * and a laser smoke-obscuration meter. Everything is procedural; static parts are merged per material so the whole
 * cell costs a few dozen draw calls.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BOX } from "@/lib/flameEngine3D";

export type LabState = {
  o2: number;
  pressureAtm: number;
  g: number;
  /** forced air, 0..1 */
  flowK: number;
  fuel: "methanol" | "heptane";
  /** how alive the flame is, 0..1 */
  intensity: number;
};

export type LabDome = { group: THREE.Group; update: (dt: number, st: LabState) => void; dispose: () => void };

type V3 = [number, number, number];
const TAU = Math.PI * 2;
const F = BOX.yMin - 0.3; // floor level

export function buildLabDome(): LabDome {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };

  /* ------------------------------------------------------------ materials */
  const steel = track(new THREE.MeshStandardMaterial({ color: 0xb3bcc8, roughness: 0.3, metalness: 1, envMapIntensity: 1.4 }));
  const darkSteel = track(new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.5, metalness: 0.85, envMapIntensity: 0.8 }));
  const enamel = track(new THREE.MeshStandardMaterial({ color: 0xdde1e6, roughness: 0.42, metalness: 0.15, envMapIntensity: 0.9 }));
  const rubber = track(new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.85, metalness: 0.1 }));
  const redPaint = track(new THREE.MeshStandardMaterial({ color: 0xc21f1f, roughness: 0.35, metalness: 0.3 }));
  const whitePaint = track(new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.5, metalness: 0.1 }));
  const glow = (c: number, k: number) => track(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
  const stripMat = glow(0xf1f6ff, 1.45);
  const warmStrip = glow(0xffe2bd, 1.6);
  const panelLight = glow(0xfff1da, 1.5);
  const ledGreen = glow(0x35e07a, 1.8);
  const ledAmber = glow(0xffb02e, 1.8);
  const ledRed = glow(0xff4a3d, 1.8);
  const gasColors: Record<string, number> = { O2: 0x1f8a46, N2: 0x16181c, CO2: 0x858b96, He: 0x7a4f2a };
  const gasMats: Record<string, THREE.MeshStandardMaterial> = {};
  for (const k of Object.keys(gasColors)) gasMats[k] = track(new THREE.MeshStandardMaterial({ color: gasColors[k], roughness: 0.4, metalness: 0.45, envMapIntensity: 1.1 }));

  /* ------------------------------------------------------------ textures */
  const canvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!);
    const t = track(new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    return t;
  };
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const panelTex = (cols: number, rows: number, base: [number, number, number]) =>
    canvasTex(1024, 512, (c) => {
      const cw = 1024 / cols, ch = 512 / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const d = (rnd() - 0.5) * 14;
        c.fillStyle = `rgb(${base[0] + d},${base[1] + d},${base[2] + d})`;
        c.fillRect(i * cw, j * ch, cw, ch);
      }
      c.strokeStyle = "rgba(40,46,54,0.85)"; c.lineWidth = 2;
      for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(i * cw, 0); c.lineTo(i * cw, 512); c.stroke(); }
      for (let j = 0; j <= rows; j++) { c.beginPath(); c.moveTo(0, j * ch); c.lineTo(1024, j * ch); c.stroke(); }
      c.fillStyle = "rgba(30,34,40,0.9)";
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) for (const [ox, oy] of [[6, 6], [cw - 6, 6], [6, ch - 6], [cw - 6, ch - 6]]) { c.beginPath(); c.arc(i * cw + ox, j * ch + oy, 1.6, 0, TAU); c.fill(); }
    });
  const pleatTex = canvasTex(256, 256, (c) => {
    c.fillStyle = "#e9ecee"; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 64; i++) { c.fillStyle = i % 2 ? "#cfd4d8" : "#f6f8f9"; c.fillRect(i * 4, 0, 4, 256); }
    c.strokeStyle = "#7d858c"; c.lineWidth = 6; c.strokeRect(0, 0, 256, 256);
  });
  const ventTex = canvasTex(128, 64, (c) => {
    c.fillStyle = "#14181d"; c.fillRect(0, 0, 128, 64);
    c.fillStyle = "#06080a";
    for (let i = 0; i < 9; i++) c.fillRect(8, 6 + i * 6, 112, 3);
  });
  const hazardTex = canvasTex(512, 32, (c) => {
    c.fillStyle = "#d9b52c"; c.fillRect(0, 0, 512, 32);
    c.fillStyle = "#14171b";
    for (let i = -2; i < 34; i++) { c.beginPath(); c.moveTo(i * 16, 32); c.lineTo(i * 16 + 8, 32); c.lineTo(i * 16 + 24, 0); c.lineTo(i * 16 + 16, 0); c.closePath(); c.fill(); }
  }, [26, 1]);
  const gaugeTex = (value: number, tint: string) =>
    canvasTex(128, 128, (c) => {
      c.fillStyle = "#f2f2ee"; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill();
      c.strokeStyle = "#1a1a1a"; c.lineWidth = 2;
      for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5; c.beginPath(); c.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); c.stroke(); }
      c.strokeStyle = tint; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 40, Math.PI * 0.75 + Math.PI * 1.5 * 0.8, Math.PI * 2.25); c.stroke();
      const a = Math.PI * 0.75 + value * Math.PI * 1.5;
      c.strokeStyle = "#c01818"; c.lineWidth = 3; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); c.stroke();
      c.fillStyle = "#222"; c.beginPath(); c.arc(64, 64, 5, 0, TAU); c.fill();
    });
  const ventMat = track(new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.7, metalness: 0.3 }));
  const gaugeMats = [0.35, 0.62, 0.48, 0.74].map((v) => track(new THREE.MeshBasicMaterial({ map: gaugeTex(v, "#d9b52c"), toneMapped: false })));

  /* ------------------------------------------------------------ batching of static geometry */
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const mat4 = (p: V3, r: V3, s: number | V3) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
  const push = (m: THREE.Material, g: THREE.BufferGeometry) => {
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    let list = batches.get(m);
    if (!list) { list = []; batches.set(m, list); }
    list.push(g);
  };
  /** put geometry into the merge batch, positioned in the local frame of a parent placed at p and turned ry about Y */
  const frame = (p: V3 = [0, 0, 0], ry = 0) => {
    const parent = mat4(p, [0, ry, 0], 1);
    const put = (m: THREE.Material, geo: THREE.BufferGeometry, lp: V3 = [0, 0, 0], lr: V3 = [0, 0, 0], ls: number | V3 = 1) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.applyMatrix4(mat4(lp, lr, ls));
      g.applyMatrix4(parent);
      push(m, g);
    };
    const world = (lp: V3) => new THREE.Vector3(...lp).applyMatrix4(parent);
    return { put, world, ry };
  };
  const W = frame();
  const cyl = (rt: number, rb: number, h: number, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);
  const tube = (pts: V3[], r: number, seg = 48, radial = 10, tension = 0.5) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", tension), seg, r, radial, false);
  /** a cylinder between two world points */
  const rod = (m: THREE.Material, a: V3, b: V3, r: number, seg = 8) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = cyl(r, r, len, seg).toNonIndexed();
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()), new THREE.Vector3(1, 1, 1)));
    push(m, g);
  };

  /* ------------------------------------------------------------ live read-outs */
  type Screen = { c: CanvasRenderingContext2D; tex: THREE.CanvasTexture; draw: (c: CanvasRenderingContext2D, st: LabState) => void };
  const screens: Screen[] = [];
  const addScreen = (w: number, h: number, pw: number, ph: number, pos: THREE.Vector3, ry: number, draw: Screen["draw"]) => {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const tex = track(new THREE.CanvasTexture(cv));
    tex.colorSpace = THREE.SRGBColorSpace;
    screens.push({ c: cv.getContext("2d")!, tex, draw });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
    mesh.position.copy(pos);
    mesh.rotation.y = ry;
    group.add(mesh);
  };
  const txt = (c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string) => { c.fillStyle = color; c.font = `600 ${size}px ui-monospace, Menlo, Consolas, monospace`; c.fillText(s, x, y); };
  const bg = (c: CanvasRenderingContext2D, w: number, h: number, color = "#06110c") => { c.fillStyle = color; c.fillRect(0, 0, w, h); c.strokeStyle = "#1f3a2c"; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); };

  /* ============================================================ DOME ============================================================ */
  const R = 30, SY = 0.62;
  const shellTex = panelTex(40, 9, [168, 176, 186]);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 40, 0, TAU, 0, Math.PI / 2),
    track(new THREE.MeshStandardMaterial({ map: shellTex, color: 0xcdd4dc, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.55, side: THREE.BackSide })),
  );
  shell.scale.y = SY;
  shell.position.y = F;
  group.add(shell);
  const wallTex = panelTex(48, 3, [150, 158, 168]);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 5, 96, 1, true), track(new THREE.MeshStandardMaterial({ map: wallTex, color: 0xb9c0c9, roughness: 0.6, metalness: 0.3, side: THREE.BackSide })));
  wall.position.y = F + 2.5;
  group.add(wall);
  const rr = R - 0.12;
  const arc = (a: number, off = 0) => {
    const pts: V3[] = [];
    for (let k = 0; k <= 44; k++) { const t = (k / 44) * (Math.PI / 2); pts.push([Math.cos(t) * Math.cos(a) * (rr - off), F + Math.sin(t) * rr * SY - off * 0.4, Math.cos(t) * Math.sin(a) * (rr - off)]); }
    return pts;
  };
  const NRIB = 24;
  for (let i = 0; i < NRIB; i++) {
    const a = (i / NRIB) * TAU;
    W.put(steel, tube(arc(a), 0.2, 44, 8, 0.5));
    if (i % 2 === 0) W.put(stripMat, tube(arc(a + 0.045, 0.5), 0.06, 44, 6, 0.5));
  }
  for (const t of [0.22, 0.5, 0.78, 1.04, 1.28]) {
    W.put(steel, new THREE.TorusGeometry(Math.cos(t) * rr, 0.22, 8, 120), [0, F + Math.sin(t) * rr * SY, 0], [Math.PI / 2, 0, 0]);
  }
  W.put(warmStrip, new THREE.TorusGeometry(Math.cos(0.62) * (rr - 0.5), 0.07, 6, 120), [0, F + Math.sin(0.62) * (rr - 0.5) * SY, 0], [Math.PI / 2, 0, 0]);
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), glow(0xdbe8ff, 1.7));
  oculus.rotation.x = Math.PI / 2;
  oculus.position.y = F + R * SY - 0.25;
  group.add(oculus);

  /* ============================================================ FLOOR MARKINGS ============================================================ */
  const hazard = new THREE.Mesh(new THREE.RingGeometry(7.4, 7.9, 128).rotateX(-Math.PI / 2), track(new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.5, metalness: 0.2 })));
  hazard.position.y = F + 0.016;
  group.add(hazard);
  for (const [a, b] of [[12, 12.07], [20, 20.07]]) {
    const line = new THREE.Mesh(new THREE.RingGeometry(a, b, 128).rotateX(-Math.PI / 2), track(new THREE.MeshBasicMaterial({ color: 0x5b6572 })));
    line.position.y = F + 0.016;
    group.add(line);
  }

  /* ============================================================ SMOKE-EXTRACTION HOOD ============================================================ */
  const hoodY = BOX.yMax + 3.1;
  const hoodMat = track(new THREE.MeshStandardMaterial({ color: 0xaab3bf, roughness: 0.32, metalness: 1, side: THREE.DoubleSide, envMapIntensity: 1.3 }));
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 4.6, 2.3, 56, 1, true), hoodMat);
  hood.position.set(0, hoodY + 1.15, 0);
  group.add(hood);
  W.put(steel, new THREE.TorusGeometry(4.6, 0.08, 10, 80), [0, hoodY, 0], [Math.PI / 2, 0, 0]);
  const ductTop = F + R * SY - 0.4;
  const ductLen = ductTop - (hoodY + 2.3);
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, ductLen, 40, 1, true), hoodMat);
  duct.position.set(0, hoodY + 2.3 + ductLen / 2, 0);
  group.add(duct);
  for (let y = hoodY + 2.8; y < ductTop - 0.4; y += 0.7) W.put(steel, new THREE.TorusGeometry(0.97, 0.035, 8, 40), [0, y, 0], [Math.PI / 2, 0, 0]);
  W.put(steel, new THREE.TorusGeometry(1.1, 0.07, 8, 40), [0, hoodY + 2.35, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    rod(darkSteel, [Math.cos(a) * 4.0, hoodY + 0.15, Math.sin(a) * 4.0], [Math.cos(a) * 1.0, hoodY + 2.2, Math.sin(a) * 1.0], 0.04);
  }
  rod(darkSteel, [1.4, hoodY + 2.0, 0.4], [1.4, hoodY + 0.9, 0.4], 0.07, 14);
  W.put(steel, new THREE.SphereGeometry(0.14, 18, 12), [1.4, hoodY + 0.85, 0.4]);

  /* ============================================================ INDUSTRIAL FAN, HEPA INTAKE (blows towards +x) ============================================================ */
  const FX = -BOX.x - 3.6, FY = 0.3;
  const fanG = new THREE.Group();
  fanG.position.set(FX, FY, 0);
  group.add(fanG);
  const fput = (m: THREE.Material, geo: THREE.BufferGeometry, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p); mesh.rotation.set(...r);
    fanG.add(mesh);
    return mesh;
  };
  const bellMat = track(new THREE.MeshStandardMaterial({ color: 0x2c333d, roughness: 0.42, metalness: 0.9, side: THREE.DoubleSide, envMapIntensity: 1.1 }));
  const bell = new THREE.LatheGeometry([[1.7, -1.0], [1.36, -0.82], [1.2, -0.56], [1.2, 0.56], [1.3, 0.82], [1.62, 1.06]].map(([r, x]) => new THREE.Vector2(r, x)), 64);
  bell.rotateZ(-Math.PI / 2);
  fput(bellMat, bell);
  for (const x of [-0.56, 0.56]) {
    fput(steel, new THREE.TorusGeometry(1.24, 0.06, 10, 64), [x, 0, 0], [0, Math.PI / 2, 0]);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; fput(steel, cyl(0.045, 0.045, 0.1, 6), [x, Math.cos(a) * 1.24, Math.sin(a) * 1.24], [0, 0, Math.PI / 2]); }
  }
  fput(darkSteel, cyl(0.52, 0.52, 0.7, 36), [-0.78, 0, 0], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 6; i++) fput(steel, new THREE.TorusGeometry(0.53, 0.03, 8, 36), [-0.55 - i * 0.1, 0, 0], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; fput(darkSteel, box(0.08, 0.7, 0.16), [-0.8, Math.cos(a) * 0.86, Math.sin(a) * 0.86], [a, 0, 0]); }
  // rotor: hub, nose cone and seven twisted blades
  const rotor = new THREE.Group();
  rotor.position.x = -0.15;
  fanG.add(rotor);
  const rput = (m: THREE.Material, geo: THREE.BufferGeometry, p: V3, r: V3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(...p); mesh.rotation.set(...r); rotor.add(mesh); };
  rput(darkSteel, cyl(0.26, 0.26, 0.46, 32), [0, 0, 0], [0, 0, Math.PI / 2]);
  rput(steel, new THREE.ConeGeometry(0.25, 0.42, 32), [0.42, 0, 0], [0, 0, -Math.PI / 2]);
  const bladeMat = track(new THREE.MeshStandardMaterial({ color: 0x3a424d, roughness: 0.38, metalness: 0.85, side: THREE.DoubleSide, envMapIntensity: 1.3 }));
  for (let i = 0; i < 7; i++) {
    const g = new THREE.PlaneGeometry(0.4, 0.92, 5, 12).rotateY(Math.PI / 2);
    const pa = g.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pa.count; v++) {
      const cz = pa.getZ(v);
      const y = pa.getY(v) + 0.46 + 0.22;
      const t = (y - 0.22) / 0.92;
      const z = cz * (1 - 0.28 * t);
      const pitch = 0.95 - 0.6 * t;
      pa.setXYZ(v, z * Math.sin(pitch) - 0.04 * Math.sin(Math.PI * (cz / 0.4 + 0.5)), y, z * Math.cos(pitch));
    }
    g.computeVertexNormals();
    const holder = new THREE.Group();
    holder.rotation.x = (i / 7) * TAU;
    holder.add(new THREE.Mesh(g, bladeMat));
    rotor.add(holder);
  }
  // protective guard on the outlet: three rings and eight spokes across
  for (const r of [0.42, 0.82, 1.22]) fput(steel, new THREE.TorusGeometry(r, 0.022, 8, 64), [1.06, 0, 0], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 8; i++) fput(steel, box(0.025, 2.44, 0.025), [1.06, 0, 0], [(i / 8) * Math.PI, 0, 0]);
  fput(darkSteel, cyl(0.16, 0.16, 0.05, 24), [1.06, 0, 0], [0, 0, Math.PI / 2]);
  // HEPA intake: housing, pleated filter face, frame and a differential-pressure gauge
  fput(enamel, rbox(1.0, 2.7, 2.7, 0.06), [-1.7, 0, 0]);
  const filterFace = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), track(new THREE.MeshStandardMaterial({ map: pleatTex, roughness: 0.9, metalness: 0 })));
  filterFace.position.set(-2.21, 0, 0);
  filterFace.rotation.y = -Math.PI / 2;
  fanG.add(filterFace);
  for (const [dy, dz, sy, sz] of [[1.2, 0, 0.1, 2.5], [-1.2, 0, 0.1, 2.5], [0, 1.2, 2.5, 0.1], [0, -1.2, 2.5, 0.1]] as const) fput(steel, box(0.06, sy, sz), [-2.22, dy, dz]);
  const hepaGauge = new THREE.Mesh(new THREE.CircleGeometry(0.14, 28), gaugeMats[1]);
  hepaGauge.position.set(-1.7, 0.95, 1.37);
  fanG.add(hepaGauge);
  fput(steel, new THREE.TorusGeometry(0.15, 0.025, 8, 28), [-1.7, 0.95, 1.36]);
  // stand: base plate, two posts, saddle, control box with speed knob and LEDs
  const baseY = F - FY;
  fput(darkSteel, rbox(2.9, 0.14, 2.6, 0.04), [-0.4, baseY + 0.07, 0]);
  const postTop = -1.3, postBot = baseY + 0.14;
  for (const z of [-0.95, 0.95]) fput(darkSteel, box(0.16, postTop - postBot, 0.16), [0, (postTop + postBot) / 2, z]);
  fput(darkSteel, box(0.16, 0.1, 2.3), [0, -1.28, 0]);
  fput(enamel, rbox(0.5, 0.74, 0.3, 0.03), [0.3, baseY + 0.55, 1.15]);
  fput(rubber, cyl(0.07, 0.07, 0.06, 20), [0.3, baseY + 0.75, 1.31], [Math.PI / 2, 0, 0]);
  fput(ledGreen, new THREE.SphereGeometry(0.025, 8, 6), [0.17, baseY + 0.5, 1.31]);
  fput(ledAmber, new THREE.SphereGeometry(0.025, 8, 6), [0.3, baseY + 0.5, 1.31]);
  fput(ledRed, new THREE.SphereGeometry(0.025, 8, 6), [0.43, baseY + 0.5, 1.31]);

  /* ============================================================ OPTICAL PORT + HIGH-SPEED CAMERA ON A TRIPOD ============================================================ */
  const cy0 = 0.2, cz0 = 0.2;
  W.put(steel, new THREE.TorusGeometry(0.48, 0.06, 12, 48), [BOX.x + 0.01, cy0, cz0], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; W.put(steel, cyl(0.04, 0.04, 0.09, 6), [BOX.x + 0.02, cy0 + Math.cos(a) * 0.48, cz0 + Math.sin(a) * 0.48], [0, 0, Math.PI / 2]); }
  W.put(darkSteel, cyl(0.46, 0.46, 0.3, 40), [BOX.x + 0.3, cy0, cz0], [0, 0, Math.PI / 2]);
  W.put(steel, cyl(0.4, 0.43, 0.22, 40), [BOX.x + 0.6, cy0, cz0], [0, 0, Math.PI / 2]);
  W.put(darkSteel, cyl(0.34, 0.38, 0.35, 40), [BOX.x + 0.9, cy0, cz0], [0, 0, Math.PI / 2]);
  for (const x of [0.5, 0.74]) W.put(rubber, new THREE.TorusGeometry(0.41, 0.03, 8, 40), [BOX.x + x, cy0, cz0], [0, Math.PI / 2, 0]);
  W.put(darkSteel, rbox(1.1, 0.74, 0.86, 0.08), [BOX.x + 1.75, cy0, cz0]);
  W.put(steel, box(0.04, 0.5, 0.5), [BOX.x + 2.3, cy0, cz0]);
  W.put(ledGreen, new THREE.SphereGeometry(0.03, 8, 6), [BOX.x + 1.4, cy0 + 0.3, cz0 + 0.44]);
  W.put(ledRed, new THREE.SphereGeometry(0.03, 8, 6), [BOX.x + 1.52, cy0 + 0.3, cz0 + 0.44]);
  const head: V3 = [BOX.x + 1.75, cy0 - 0.5, cz0];
  W.put(steel, cyl(0.1, 0.1, 0.18, 20), head);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.4; rod(darkSteel, head, [head[0] + Math.cos(a) * 1.0, F + 0.02, head[2] + Math.sin(a) * 1.0], 0.035); }

  /* ============================================================ LASER SMOKE-OBSCURATION METER ============================================================ */
  const ly = -1.75, lx = 2.3;
  for (const s of [-1, 1]) {
    W.put(darkSteel, cyl(0.1, 0.1, 0.4, 20), [lx, ly, s * (BOX.z + 0.3)], [Math.PI / 2, 0, 0]);
    W.put(steel, cyl(0.06, 0.06, 0.1, 16), [lx, ly, s * (BOX.z + 0.07)], [Math.PI / 2, 0, 0]);
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, BOX.z * 2 + 0.3, 6).rotateX(Math.PI / 2), track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3328).multiplyScalar(2.4), transparent: true, opacity: 0.8 })));
  beam.position.set(lx, ly, 0);
  group.add(beam);

  /* ============================================================ PARTICLE COUNTERS ON TRIPODS, WITH SAMPLING LINES ============================================================ */
  const counter = (x: number, z: number, portY: number, portZ: number, label: string) => {
    const ry = Math.atan2(-x, -z);
    const f = frame([x, F, z], ry);
    const apex: V3 = [x, F + 1.55, z];
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.6; rod(darkSteel, apex, [x + Math.cos(a) * 0.75, F + 0.02, z + Math.sin(a) * 0.75], 0.025); }
    f.put(steel, cyl(0.05, 0.05, 0.35, 12), [0, 1.62, 0]);
    f.put(enamel, rbox(0.95, 0.66, 0.72, 0.06), [0, 1.98, 0]);
    f.put(darkSteel, box(0.84, 0.46, 0.04), [0, 1.98, 0.37]);
    f.put(steel, cyl(0.06, 0.06, 0.1, 16), [0.3, 1.78, 0.4], [Math.PI / 2, 0, 0]);
    f.put(ledGreen, new THREE.SphereGeometry(0.022, 8, 6), [-0.38, 1.76, 0.38]);
    f.put(ledAmber, new THREE.SphereGeometry(0.022, 8, 6), [-0.3, 1.76, 0.38]);
    f.put(steel, cyl(0.025, 0.025, 0.3, 10), [0, 2.4, -0.1]);
    f.put(steel, new THREE.SphereGeometry(0.05, 10, 8), [0, 2.57, -0.1]);
    const sc = f.world([0, 1.98, 0.395]);
    addScreen(256, 128, 0.78, 0.4, sc, ry, (c, st) => {
      bg(c, 256, 128);
      txt(c, label, 14, 24, 17, "#7ef0b0");
      const pm = (st.fuel === "heptane" ? 420 : 38) * Math.pow(st.intensity, 1.3) + 4;
      txt(c, pm.toFixed(0), 14, 82, 54, "#b8ffd6");
      txt(c, "µg/m³", 150, 82, 20, "#7ef0b0");
      txt(c, st.intensity > 0.05 ? "SAMPLING" : "STANDBY", 14, 114, 15, st.intensity > 0.05 ? "#ffd36b" : "#6a8f7c");
    });
    // sampling line: out of the counter's inlet, sagging, into a flanged port on the glass
    const inlet = f.world([0.3, 1.78, 0.46]);
    const port: V3 = [BOX.x + 0.12, portY, portZ];
    W.put(steel, new THREE.TorusGeometry(0.17, 0.03, 10, 28), [BOX.x + 0.01, portY, portZ], [0, Math.PI / 2, 0]);
    W.put(darkSteel, cyl(0.06, 0.06, 0.2, 14), [BOX.x + 0.1, portY, portZ], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; W.put(steel, cyl(0.018, 0.018, 0.05, 6), [BOX.x + 0.02, portY + Math.cos(a) * 0.17, portZ + Math.sin(a) * 0.17], [0, 0, Math.PI / 2]); }
    const mid: V3 = [(inlet.x + port[0]) / 2, Math.min(inlet.y, portY) - 0.5, (inlet.z + port[2]) / 2];
    W.put(rubber, tube([[inlet.x, inlet.y, inlet.z], mid, [port[0] + 0.25, portY, port[2]], port], 0.03, 40, 8, 0.5));
  };
  counter(BOX.x + 2.6, BOX.z + 1.4, -1.0, 1.5, "PM2.5 COUNTER A");
  counter(BOX.x + 2.3, -BOX.z - 1.1, 0.9, -1.4, "PM10 COUNTER B");

  /* ============================================================ INSTRUMENT RACKS WITH LIVE READ-OUTS ============================================================ */
  const rack = (x: number, z: number, kind: "A" | "B") => {
    const ry = -Math.PI / 2;
    const f = frame([x, F, z], ry);
    f.put(darkSteel, box(1.5, 4.5, 1.2), [0, 2.25, 0]);
    f.put(steel, box(1.64, 0.1, 1.3), [0, 4.55, 0]);
    f.put(steel, box(1.64, 0.1, 1.3), [0, 0.05, 0]);
    for (const sx of [-1, 1]) f.put(steel, cyl(0.02, 0.02, 3.8, 8), [sx * 0.66, 2.25, 0.66]);
    for (let i = 0; i < 9; i++) {
      const y = 0.45 + i * 0.46;
      const type = (i + (kind === "B" ? 1 : 0)) % 3;
      if (type === 0) {
        f.put(darkSteel, box(1.36, 0.4, 0.06), [0, y, 0.63]);
        const p = f.world([0, y, 0.665]);
        addScreen(256, 56, 1.2, 0.28, p, ry, (c, st) => {
          bg(c, 256, 56);
          const lines: string[][] = kind === "A"
            ? [[`O2  ${(st.o2 * 100).toFixed(1)} %`, `P ${(st.pressureAtm * 14.696).toFixed(1)} psi`], [`g ${st.g.toFixed(2)}`, `FLOW ${(st.flowK * 40).toFixed(0)} cm/s`], [`FLAME ${(st.intensity * 100).toFixed(0)} %`, st.fuel.toUpperCase()]]
            : [[`TC1 ${(300 + 1500 * st.intensity).toFixed(0)} K`, `TC2 ${(300 + 900 * st.intensity).toFixed(0)} K`], [`CO2 ${(400 + 38000 * st.intensity * (st.fuel === "heptane" ? 1 : 0.6)).toFixed(0)} ppm`, `CO ${(2 + 120 * st.intensity).toFixed(0)} ppm`], [`H2O ${(1.1 + 3.2 * st.intensity).toFixed(1)} %`, `${st.intensity > 0.05 ? "BURN" : "OUT"}`]];
          const pick = lines[(i + 3) % 3];
          txt(c, pick[0], 12, 24, 20, "#b8ffd6");
          txt(c, pick[1], 12, 47, 17, "#7ef0b0");
        });
      } else if (type === 1) {
        f.put(darkSteel, box(1.36, 0.4, 0.05), [0, y, 0.63]);
        f.put(ventMat, new THREE.PlaneGeometry(1.2, 0.3), [0, y, 0.66]);
      } else {
        f.put(darkSteel, box(1.36, 0.4, 0.05), [0, y, 0.63]);
        for (let k = 0; k < 6; k++) {
          f.put(k % 3 === 0 ? ledGreen : k % 3 === 1 ? ledAmber : steel, cyl(0.04, 0.04, 0.04, 14), [-0.5 + k * 0.2, y + 0.07, 0.66], [Math.PI / 2, 0, 0]);
          f.put(darkSteel, cyl(0.055, 0.055, 0.03, 14), [-0.5 + k * 0.2, y - 0.08, 0.655], [Math.PI / 2, 0, 0]);
        }
      }
      f.put(steel, new THREE.SphereGeometry(0.018, 8, 6), [-0.65, y + 0.15, 0.665]);
      f.put(steel, new THREE.SphereGeometry(0.018, 8, 6), [0.65, y + 0.15, 0.665]);
    }
    f.put(ledGreen, new THREE.SphereGeometry(0.03, 8, 6), [0.6, 4.35, 0.62]);
    f.put(ledAmber, new THREE.SphereGeometry(0.03, 8, 6), [0.5, 4.35, 0.62]);
  };
  rack(BOX.x + 4.8, -1.6, "A");
  rack(BOX.x + 4.8, -3.4, "B");
  // cables running from the racks to the chamber base
  for (let i = 0; i < 3; i++) {
    W.put(rubber, tube([[BOX.x + 4.1, F + 0.1, -1.3 - i * 0.12], [BOX.x + 2.6, F + 0.05, -0.6 - i * 0.2], [BOX.x + 1.2, F + 0.05, -0.2 - i * 0.12], [BOX.x + 0.3, F + 0.3, -0.2]], 0.04, 40, 8, 0.5));
  }

  /* ============================================================ GAS CYLINDERS, REGULATORS AND PIPED SUPPLY LINES ============================================================ */
  const gases = ["O2", "N2", "CO2", "He"];
  const z0 = -BOX.z - 3.5;
  const xs = [-8.4, -7.2, -6.0, -4.8];
  W.put(steel, box(4.4, 0.08, 0.08), [-6.6, F + 1.7, z0 - 0.45]);
  W.put(steel, box(4.4, 0.08, 0.08), [-6.6, F + 2.6, z0 - 0.45]);
  gases.forEach((gname, i) => {
    const cx = xs[i];
    const f = frame([cx, F, z0], 0);
    const mat = gasMats[gname];
    f.put(mat, cyl(0.38, 0.38, 3.0, 36), [0, 1.5, 0]);
    f.put(mat, new THREE.SphereGeometry(0.38, 36, 16, 0, TAU, 0, Math.PI / 2), [0, 3.0, 0]);
    f.put(whitePaint, cyl(0.386, 0.386, 0.5, 36), [0, 2.35, 0]);
    f.put(steel, cyl(0.11, 0.13, 0.28, 18), [0, 3.5, 0]);
    f.put(steel, new THREE.TorusGeometry(0.2, 0.025, 8, 28), [0, 3.38, 0], [Math.PI / 2, 0, 0]);
    // regulator with a gauge on the front and a hand-wheel
    f.put(steel, cyl(0.1, 0.1, 0.24, 18), [0, 3.74, 0]);
    f.put(darkSteel, cyl(0.07, 0.07, 0.2, 14), [0, 3.74, 0.17], [Math.PI / 2, 0, 0]);
    f.put(mat, new THREE.TorusGeometry(0.1, 0.018, 8, 20), [0, 3.92, 0], [Math.PI / 2, 0, 0]);
    f.put(darkSteel, cyl(0.17, 0.17, 0.05, 24), [0, 3.74, 0.29], [Math.PI / 2, 0, 0]);
    const gz = f.world([0, 3.74, 0.325]);
    const gm = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), gaugeMats[i]);
    gm.position.copy(gz);
    group.add(gm);
    // strap on the rail
    f.put(darkSteel, new THREE.TorusGeometry(0.4, 0.02, 6, 28), [0, 1.7, 0], [Math.PI / 2, 0, 0]);
    // supply line to the top plate: rises, crosses above the chamber and drops into the collar
    const off = (i - 1.5) * 0.17;
    const pts: V3[] = [[cx, F + 3.95, z0], [cx, 4.7, z0], [cx + (0 - cx) * 0.15, 5.25, z0 + 0.8], [cx + (off - cx) * 0.55, 5.25, -1.3], [off, 5.25, -0.25], [off, 4.75, 0], [off, 4.12, 0]];
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.3);
    W.put(steel, new THREE.TubeGeometry(curve, 90, 0.055, 12, false));
    W.put(mat, new THREE.TubeGeometry(curve, 8, 0.07, 12, false));
    for (let k = 1; k < 11; k++) {
      const t = k / 11, p = curve.getPoint(t), tan = curve.getTangent(t);
      const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan), new THREE.Vector3(1, 1, 1));
      const g = new THREE.TorusGeometry(0.075, 0.013, 6, 18).toNonIndexed();
      g.applyMatrix4(m);
      push(darkSteel, g);
    }
    // a valve with a hand-wheel and a mass-flow controller on the vertical run
    W.put(steel, cyl(0.09, 0.09, 0.24, 16), [cx, 4.3, z0]);
    W.put(steel, cyl(0.035, 0.035, 0.3, 10), [cx, 4.3, z0 + 0.18], [Math.PI / 2, 0, 0]);
    W.put(mat, new THREE.TorusGeometry(0.12, 0.016, 8, 24), [cx, 4.3, z0 + 0.34]);
    W.put(steel, box(0.2, 0.012, 0.012), [cx, 4.3, z0 + 0.34]);
    W.put(steel, box(0.012, 0.2, 0.012), [cx, 4.3, z0 + 0.34]);
    W.put(darkSteel, rbox(0.2, 0.34, 0.16, 0.025), [cx, 5.0, z0]);
    W.put(ledGreen, new THREE.SphereGeometry(0.018, 8, 6), [cx + 0.06, 5.1, z0 + 0.085]);
  });

  /* ============================================================ OVERHEAD FAN-FILTER UNITS ============================================================ */
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const x = Math.cos(a) * 11, z = Math.sin(a) * 11, y = F + 14.2;
    W.put(enamel, rbox(1.9, 0.5, 1.9, 0.06), [x, y, z]);
    W.put(panelLight, new THREE.PlaneGeometry(1.6, 1.6).rotateX(Math.PI / 2), [x, y - 0.26, z]);
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, 0.8]]) rod(darkSteel, [x + dx, y + 0.2, z + dz], [x + dx * 0.9, y + 3.0, z + dz * 0.9], 0.02, 6);
  }

  /* ============================================================ FIRE EXTINGUISHERS ============================================================ */
  for (const [x, z] of [[10.5, 7.5], [-10.5, 6.5]]) {
    const f = frame([x, F, z], Math.atan2(-x, -z));
    f.put(darkSteel, box(0.5, 0.06, 0.5), [0, 0.03, 0]);
    f.put(redPaint, cyl(0.17, 0.17, 0.82, 28), [0, 0.5, 0]);
    f.put(redPaint, new THREE.SphereGeometry(0.17, 28, 12, 0, TAU, 0, Math.PI / 2), [0, 0.91, 0]);
    f.put(darkSteel, cyl(0.07, 0.09, 0.16, 16), [0, 1.08, 0]);
    f.put(darkSteel, box(0.28, 0.04, 0.06), [0.06, 1.18, 0]);
    f.put(rubber, new THREE.TorusGeometry(0.16, 0.02, 8, 24, Math.PI * 1.5), [0, 0.7, 0.18], [0, 0, 0.8]);
    f.put(whitePaint, cyl(0.172, 0.172, 0.22, 28), [0, 0.55, 0]);
  }

  /* ============================================================ MERGE STATIC PARTS ============================================================ */
  for (const [m, geos] of batches) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    track(merged);
    group.add(new THREE.Mesh(merged, m));
  }
  batches.clear();

  /* ============================================================ LIGHTS ============================================================ */
  const top = new THREE.PointLight(0xdbe8ff, 240, 70, 2);
  top.position.set(0, F + 15.5, 0);
  group.add(top);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const l = new THREE.PointLight(0xfff0dc, 80, 40, 2);
    l.position.set(Math.cos(a) * 15, F + 8, Math.sin(a) * 15);
    group.add(l);
  }

  /* ============================================================ UPDATE ============================================================ */
  let clock = 0, screenT = 99;
  let last: LabState = { o2: 0.21, pressureAtm: 1, g: 1, flowK: 0, fuel: "methanol", intensity: 1 };
  const base = { g: ledGreen.color.clone(), a: ledAmber.color.clone(), r: ledRed.color.clone() };
  const update = (dt: number, st: LabState) => {
    last = st;
    clock += dt;
    rotor.rotation.x += dt * (2 + st.flowK * 16);
    const blink = 0.55 + 0.45 * Math.sin(clock * 5);
    ledGreen.color.copy(base.g).multiplyScalar(0.7 + 0.3 * Math.sin(clock * 1.4));
    ledAmber.color.copy(base.a).multiplyScalar(st.intensity > 0.05 ? blink : 0.25);
    ledRed.color.copy(base.r).multiplyScalar(st.flowK > 0.05 ? 0.4 + 0.6 * blink : 0.3);
    screenT += dt;
    if (screenT > 0.4) {
      screenT = 0;
      for (const s of screens) { s.draw(s.c, last); s.tex.needsUpdate = true; }
    }
  };

  return {
    group,
    update,
    dispose: () => {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
      });
      for (const d of disposables) d.dispose();
    },
  };
}
