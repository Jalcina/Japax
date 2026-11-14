/**
 * HyperFire: a physically-motivated, ray-marched volumetric flame with smoke, embers and a dynamic light,
 * built to sit inside the cinematic NASA scenes.
 *
 * What is driven by the data (gravity, O2, pressure, fuel, flame fate) and what is artistic:
 *  - gravity sets the shape: ~0 g gives a thin spherical blue shell (pure diffusion), 1 g a buoyant teardrop,
 *    partial gravity blends the two; smoke rises with sqrt(g) and drifts radially at 0 g
 *  - O2 sets height, brightness and how white/blue the flame looks; heptane is sooty, methanol is clean and blue
 *  - the exact look is an illustration, not a measurement
 */
import * as THREE from "three";

export type FireParams = {
  g: number;
  o2: number;
  pressureAtm: number;
  fuel: "methanol" | "heptane";
  fate: "burn" | "extinguish" | "unknown";
  /** gentle forced air in world space (m/s-ish); bends the flame */
  wind?: [number, number, number];
};

export type FireMount = "pan" | "droplet";

export type HyperFire = {
  group: THREE.Group;
  update: (dt: number, t: number, camera: THREE.PerspectiveCamera, pxPerUnit: number) => void;
  set: (p: FireParams) => void;
  /** use inside a chamber driven by the molecular engine: radius and height of the reaction zone, world units */
  setPose: (radius: number, zoneY: number, dropletY?: number) => void;
  /** let an external engine decide how alive the flame is (0..1); null gives control back to the built-in cycle */
  setLife: (v: number | null) => void;
  reignite: () => void;
  dispose: () => void;
};

// ---------------------------------------------------------------- shared 3D noise (built once)
let noiseTex: THREE.Data3DTexture | null = null;
function getNoise() {
  if (noiseTex) return noiseTex;
  const N = 64;
  const data = new Uint8Array(N * N * N);
  let s = 1337 >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cells = [4, 8, 16, 32];
  const amps = [0.5, 0.27, 0.15, 0.08];
  const lat = cells.map((c) => Float32Array.from({ length: c * c * c }, rnd));
  const sm = (x: number) => x * x * (3 - 2 * x);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (let o = 0; o < cells.length; o++) {
      const c = cells[o];
      const fx = (x / N) * c, fy = (y / N) * c, fz = (z / N) * c;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
      const tx = sm(fx - x0), ty = sm(fy - y0), tz = sm(fz - z0);
      const at = (i: number, j: number, k: number) => lat[o][(((k % c) * c + (j % c)) * c) + (i % c)];
      const x1 = x0 + 1, y1 = y0 + 1, z1 = z0 + 1;
      const c00 = at(x0, y0, z0) * (1 - tx) + at(x1, y0, z0) * tx;
      const c10 = at(x0, y1, z0) * (1 - tx) + at(x1, y1, z0) * tx;
      const c01 = at(x0, y0, z1) * (1 - tx) + at(x1, y0, z1) * tx;
      const c11 = at(x0, y1, z1) * (1 - tx) + at(x1, y1, z1) * tx;
      v += amps[o] * ((c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz);
    }
    data[(z * N + y) * N + x] = Math.max(0, Math.min(255, Math.round(v * 255 * 1.02)));
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  noiseTex = tex;
  return tex;
}

// ---------------------------------------------------------------- flame shader
const FLAME_VERT = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLAME_FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform float uTime;
uniform float uTear;   // 0 = sphere (0 g)  ..  1 = buoyant teardrop (1 g)
uniform float uO2;     // 0..1 normalised oxygen excess
uniform float uSoot;   // 0..1
uniform float uBlue;   // 0..1 premixed / clean-burning blue
uniform float uH;      // flame height
uniform float uR0;     // teardrop base radius
uniform float uRs;     // sphere radius
uniform float uYc;     // droplet centre height (sphere mode)
uniform float uRise;   // advection speed of the turbulence
uniform float uTurb;   // displacement amplitude
uniform float uGain;   // emission gain (also carries flame life)
uniform vec3 uWind;
uniform vec3 uCam;     // camera in local space
varying vec3 vPos;

const vec3 BMIN = vec3(-1.0, -0.12, -1.0);
const vec3 BMAX = vec3( 1.0,  2.60,  1.0);
#define STEPS 52

float n3(vec3 p) { return texture(uNoise, p).r; }
float fbm(vec3 p) { return n3(p) * 0.62 + n3(p * 2.31 + vec3(0.37, 0.11, 0.73)) * 0.38; }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec3 blackbody(float t) {
  // t in 0..1  ->  deep red .. orange .. yellow .. white-hot
  vec3 c0 = vec3(0.10, 0.004, 0.0);
  vec3 c1 = vec3(0.85, 0.10, 0.01);
  vec3 c2 = vec3(1.00, 0.42, 0.04);
  vec3 c3 = vec3(1.00, 0.78, 0.26);
  vec3 c4 = vec3(1.00, 0.96, 0.82);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
  if (t < 0.78) return mix(c2, c3, (t - 0.50) / 0.28);
  return mix(c3, c4, clamp((t - 0.78) / 0.22, 0.0, 1.0));
}

vec2 boxHit(vec3 ro, vec3 rd) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (BMIN - ro) * inv, t1 = (BMAX - ro) * inv;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
}

void main() {
  vec3 ro = uCam;
  vec3 rd = normalize(vPos - uCam);
  vec2 hit = boxHit(ro, rd);
  if (hit.y <= max(hit.x, 0.0)) discard;
  float tn = max(hit.x, 0.0);
  float dt = (hit.y - tn) / float(STEPS);
  float t = tn + dt * hash(gl_FragCoord.xy + fract(uTime) * 61.0);

  vec3 C = vec3(0.0);
  float Tr = 1.0;
  float y0 = mix(uYc - uRs, 0.0, uTear);

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    float yn = (p.y - y0) / uH;
    float s = clamp(yn, 0.0, 1.0);

    // axis sways and leans with the forced air
    vec2 lean = uWind.xz * pow(max(yn, 0.0), 1.5) * 0.55
              + vec2(sin(uTime * 1.9 + yn * 3.1), cos(uTime * 1.4 + yn * 2.5)) * 0.035 * uTear * s;
    vec2 q2 = p.xz - lean;

    // turbulence is advected upward (buoyancy) and swirls
    vec3 q = vec3(q2.x, (p.y - uTime * uRise) * 0.6, q2.y) * 0.9;
    q.xz += 0.30 * (vec2(n3(q * 0.5 + 0.10), n3(q * 0.5 + 0.60)) - 0.5);
    float nz = (fbm(q) - 0.5) * 2.6;
    float nzB = (n3(vec3(q2.x, (p.y - uTime * uRise * 1.35) * 1.15, q2.y) * 2.6 + 3.7) - 0.5) * 2.6;
    nz = nz * 0.85 + nzB * 0.55;

    // envelope: blend of the 0 g sphere and the 1 g teardrop
    float sphereR = uRs * sqrt(max(0.0, 1.0 - pow(2.0 * s - 1.0, 2.0)));
    float tearR = uR0 * pow(max(1.0 - s, 0.0), 0.62) * (1.0 + 0.30 * sin(3.14159 * s));
    float rad = mix(sphereR, tearR, uTear);
    float dxz = length(q2);
    float dy = max(-yn * uH, (yn - 1.0) * uH);
    float dist = max(dxz - rad, dy);
    float amp = uTurb * (0.30 + 1.25 * s);
    dist += nz * amp;

    // flame body (teardrop) and thin reaction shell (sphere)
    float body = smoothstep(0.05, -0.12, dist);
    body *= 1.0 - smoothstep(0.72, 1.08, s + nz * 0.55) * uTear;
    float shellW = 0.045 * uRs + 0.010;
    float shell = exp(-pow(dist / shellW, 2.0)) * 1.6 + 0.045 * smoothstep(0.0, -0.30 * uRs, dist);
    float dens = mix(shell, body, uTear);
    dens *= mix(1.0, clamp(0.95 + 1.15 * nzB, 0.25, 1.6), uTear * 0.9);

    if (dens > 0.004) {
      // temperature: hot near the base and the axis, cooler at the tip
      float core = 1.0 - smoothstep(0.0, uR0 * 1.1, dxz);
      float hot = clamp(1.10 - 0.76 * s + 0.32 * core + nz * 0.50, 0.0, 1.0);
      hot = mix(0.60 + nz * 0.35, hot, uTear);
      vec3 col = blackbody(clamp(hot * (0.78 + 0.55 * uO2), 0.0, 1.0));
      // blue: clean fuels, oxygen-rich air, the 0 g shell and the base of any flame
      float blueAmt = clamp(pow(1.0 - uTear, 3.0) * 1.12 + 0.85 * (1.0 - smoothstep(0.0, 0.20, s)) * uTear * (0.30 + 0.70 * uBlue), 0.0, 1.0);
      blueAmt *= 1.0 - 0.62 * uSoot * (0.25 + 0.75 * uTear);
      col = mix(col, vec3(0.10, 0.36, 1.55), blueAmt);

      float emit = dens * dt * uGain;
      float sigma = dens * (3.6 + uSoot * 11.0 * smoothstep(0.30, 0.95, s) * uTear);
      C += Tr * emit * col;
      Tr *= exp(-sigma * dt * 5.0);
      if (Tr < 0.01) break;
    }
    t += dt;
  }
  float a = 1.0 - Tr;
  gl_FragColor = vec4(C, a);
}`;

// ---------------------------------------------------------------- smoke + embers
const PART_VERT = /* glsl */ `
attribute float aSize;
attribute float aAge;
attribute float aSeed;
uniform float uPx;
uniform float uScale;
varying float vAge;
varying float vSeed;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale * uPx / max(0.05, -mv.z), 0.0, 480.0);
  vAge = aAge;
  vSeed = aSeed;
}`;

const SMOKE_FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform float uAlpha;
uniform float uGlow;
varying float vAge;
varying float vSeed;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float soft = pow(1.0 - r, 1.4);
  float n = texture(uNoise, vec3(uv * 0.55 + vSeed, vSeed * 3.1 + vAge * 0.25)).r;
  float body = soft * smoothstep(0.18, 0.78, n + 0.18);
  float fade = smoothstep(0.0, 0.10, vAge) * pow(1.0 - vAge, 1.35);
  vec3 smoke = vec3(0.075, 0.07, 0.068) + 0.10 * n;
  // young smoke is lit orange by the flame, old smoke goes grey
  float warm = pow(1.0 - vAge, 3.0) * uGlow;
  vec3 col = mix(smoke, vec3(1.0, 0.42, 0.10) * 0.9, warm * 0.55);
  gl_FragColor = vec4(col, body * fade * uAlpha);
}`;

const EMBER_FRAG = /* glsl */ `
precision highp float;
varying float vAge;
varying float vSeed;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float core = pow(1.0 - r, 2.2);
  vec3 col = mix(vec3(4.0, 2.3, 0.7), vec3(2.4, 0.35, 0.05), clamp(vAge * 1.4, 0.0, 1.0));
  float tw = 0.75 + 0.25 * sin(vSeed * 50.0 + vAge * 40.0);
  float a = core * (1.0 - vAge) * tw;
  gl_FragColor = vec4(col * a, a);
}`;

const smoothClamp = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createHyperFire(opts: { scale?: number; mount?: FireMount; light?: number; hardware?: boolean } = {}): HyperFire {
  const scale = opts.scale ?? 1;
  const mount = opts.mount ?? "pan";
  const lightK = opts.light ?? 1;
  const hardware = opts.hardware !== false;
  let curScale = scale;
  let extLife: number | null = null;
  let pose: { radius: number; zoneY: number; dropletY: number } | null = null;
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  const noise = getNoise();

  // ---- flame volume
  const flameMat = new THREE.ShaderMaterial({
    vertexShader: FLAME_VERT,
    fragmentShader: FLAME_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      uNoise: { value: noise },
      uTime: { value: 0 },
      uTear: { value: 1 },
      uO2: { value: 0.1 },
      uSoot: { value: 0.1 },
      uBlue: { value: 0.3 },
      uH: { value: 1 },
      uR0: { value: 0.25 },
      uRs: { value: 0.4 },
      uYc: { value: 0.78 },
      uRise: { value: 0.9 },
      uTurb: { value: 0.18 },
      uGain: { value: 10 },
      uWind: { value: new THREE.Vector3() },
      uCam: { value: new THREE.Vector3() },
    },
  });
  const flameMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2.72, 2).translate(0, 1.24, 0), flameMat);
  flameMesh.frustumCulled = false;
  flameMesh.renderOrder = 3;
  group.add(flameMesh);

  // ---- burner hardware
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.32, metalness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.55, metalness: 0.5 });
  const fuelGlow = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.3, metalness: 0, emissive: 0xff6a1a, emissiveIntensity: 0.6 });
  let panTop = 0;
  const isPan = mount === "pan";
  if (mount === "pan") {
    const pan = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.09, 56, 1, false), steel);
    bowl.position.y = -0.045;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 12, 64).rotateX(Math.PI / 2), steel);
    rim.position.y = 0.0;
    const surf = new THREE.Mesh(new THREE.CircleGeometry(0.40, 48).rotateX(-Math.PI / 2), fuelGlow);
    surf.position.y = -0.012;
    pan.add(bowl, rim, surf);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.18, 10), dark);
      leg.position.set(Math.cos(a) * 0.3, -0.16, Math.sin(a) * 0.3);
      pan.add(leg);
    }
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.045, 56), dark);
    plate.position.y = -0.27;
    pan.add(plate);
    pan.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    if (hardware) group.add(pan);
    panTop = 0;
  } else {
    // 0 g: a fuel droplet held on a hair-thin fibre from a probe, the flame wraps around it
    const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xdfe6f2, roughness: 0.05, clearcoat: 1, emissive: 0x332211, emissiveIntensity: 0.5 }));
    droplet.position.y = 0.78;
    const fibre = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 6).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfcdc4 }));
    fibre.position.set(-0.45, 0.78, 0);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 14).rotateZ(Math.PI / 2), steel);
    probe.position.set(-0.98, 0.78, 0);
    const mountBlock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.34), dark);
    mountBlock.position.set(-1.25, 0.78, 0);
    if (hardware) group.add(droplet, fibre, probe, mountBlock);
    panTop = 0.78;
  }
  // height of the flame centre in sphere mode: resting on the pan, or wrapped around the droplet
  const cyOf = () => (isPan ? Rs : 0.78);

  // ---- smoke
  const NS = 150;
  const sPos = new Float32Array(NS * 3), sAge = new Float32Array(NS), sSize = new Float32Array(NS), sSeed = new Float32Array(NS);
  const sVel = new Float32Array(NS * 3), sLife = new Float32Array(NS), sBase = new Float32Array(NS);
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute("aAge", new THREE.BufferAttribute(sAge, 1));
  smokeGeo.setAttribute("aSize", new THREE.BufferAttribute(sSize, 1));
  smokeGeo.setAttribute("aSeed", new THREE.BufferAttribute(sSeed, 1));
  const smokeMat = new THREE.ShaderMaterial({
    vertexShader: PART_VERT,
    fragmentShader: SMOKE_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uNoise: { value: noise }, uPx: { value: 800 }, uScale: { value: scale }, uAlpha: { value: 0.5 }, uGlow: { value: 1 } },
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = 2;
  group.add(smoke);

  // ---- embers
  const NE = 90;
  const ePos = new Float32Array(NE * 3), eAge = new Float32Array(NE), eSize = new Float32Array(NE), eSeed = new Float32Array(NE);
  const eVel = new Float32Array(NE * 3), eLife = new Float32Array(NE);
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  emberGeo.setAttribute("aAge", new THREE.BufferAttribute(eAge, 1));
  emberGeo.setAttribute("aSize", new THREE.BufferAttribute(eSize, 1));
  emberGeo.setAttribute("aSeed", new THREE.BufferAttribute(eSeed, 1));
  const emberMat = new THREE.ShaderMaterial({
    vertexShader: PART_VERT,
    fragmentShader: EMBER_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPx: { value: 800 }, uScale: { value: scale } },
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  embers.renderOrder = 4;
  group.add(embers);

  // ---- light that the flame throws on its surroundings
  const light = new THREE.PointLight(0xff8a3c, 0, 30 * scale, 2);
  light.position.set(0, 0.7, 0);
  group.add(light);

  // ---- state
  let P: FireParams = { g: 1, o2: 0.21, pressureAtm: 1, fuel: "methanol", fate: "burn" };
  let life = 1;            // 1 burning .. 0 out
  let cycleT = 0;
  let forceRelight = 0;
  const wind = new THREE.Vector3();
  // derived
  let tear = 1, o2n = 0.07, soot = 0.12, H = 1, R0 = 0.25, Rs = 0.4, smokeAmt = 0.3;
  const derive = () => {
    const g = Math.min(1, Math.max(0, P.g));
    tear = Math.pow(g, 0.3);
    o2n = Math.min(1, Math.max(0, (P.o2 - 0.15) / 0.85));
    const hep = P.fuel === "heptane";
    soot = hep ? 0.85 : 0.12;
    const H1g = (0.95 + 0.55 * o2n) * (hep ? 1.25 : 0.88) * (0.9 + 0.1 * Math.min(1.4, P.pressureAtm));
    R0 = 0.215 + 0.07 * o2n + (hep ? 0.03 : 0);
    Rs = 0.33 + 0.13 * o2n + (hep ? 0.05 : 0);
    H = tear * H1g + (1 - tear) * 2 * Rs;
    smokeAmt = hep ? 0.95 : 0.14;
    if (P.wind) wind.set(P.wind[0], P.wind[1], P.wind[2]);
    else wind.set(0, 0, 0);
  };
  derive();

  const rnd = Math.random;
  const spawnSmoke = (i: number, initial: boolean) => {
    const a = rnd() * Math.PI * 2;
    const yBase = isPan ? 0 : (1 - tear) * 0.78;
    const topY = yBase + H * (0.62 + rnd() * 0.5);
    const r = (0.05 + rnd() * 0.25) * (tear * R0 + (1 - tear) * Rs);
    // at 0 g smoke leaves the shell in every direction, at 1 g it leaves from the tip
    const dirx = Math.cos(a), dirz = Math.sin(a);
    const phi = Math.acos(2 * rnd() - 1);
    const sx = Math.sin(phi) * dirx, sy = Math.cos(phi), sz = Math.sin(phi) * dirz;
    const cy = cyOf();
    const spherical = rnd() > tear;
    if (spherical) {
      sPos[i * 3] = sx * Rs; sPos[i * 3 + 1] = cy + sy * Rs; sPos[i * 3 + 2] = sz * Rs;
      const v = 0.04 + rnd() * 0.07;
      sVel[i * 3] = sx * v; sVel[i * 3 + 1] = sy * v; sVel[i * 3 + 2] = sz * v;
    } else {
      sPos[i * 3] = dirx * r; sPos[i * 3 + 1] = topY; sPos[i * 3 + 2] = dirz * r;
      const up = (0.22 + rnd() * 0.5) * Math.sqrt(Math.max(P.g, 0.02)) * 1.6;
      sVel[i * 3] = (rnd() - 0.5) * 0.08; sVel[i * 3 + 1] = up; sVel[i * 3 + 2] = (rnd() - 0.5) * 0.08;
    }
    sLife[i] = (3.2 + rnd() * 3.2) * (1 + (1 - tear) * 1.6) * (pose ? 0.55 : 1);
    sBase[i] = 0.16 + rnd() * 0.22;
    sSeed[i] = rnd();
    sAge[i] = initial ? rnd() : 0;
    if (initial) { sPos[i * 3 + 1] += sVel[i * 3 + 1] * sAge[i] * sLife[i]; }
  };
  for (let i = 0; i < NS; i++) spawnSmoke(i, true);

  const spawnEmber = (i: number, initial: boolean) => {
    const a = rnd() * Math.PI * 2;
    const rr = rnd() * (tear * R0 + (1 - tear) * Rs) * 0.8;
    const cy = cyOf();
    eSeed[i] = rnd();
    eSize[i] = 0.014 + rnd() * 0.022;
    eLife[i] = 0.9 + rnd() * 2.1;
    eAge[i] = initial ? rnd() : 0;
    const spherical = rnd() > tear;
    if (spherical) {
      const phi = Math.acos(2 * rnd() - 1);
      const sx = Math.sin(phi) * Math.cos(a), sy = Math.cos(phi), sz = Math.sin(phi) * Math.sin(a);
      ePos[i * 3] = sx * Rs; ePos[i * 3 + 1] = cy + sy * Rs; ePos[i * 3 + 2] = sz * Rs;
      const v = 0.12 + rnd() * 0.25;
      eVel[i * 3] = sx * v; eVel[i * 3 + 1] = sy * v; eVel[i * 3 + 2] = sz * v;
    } else {
      ePos[i * 3] = Math.cos(a) * rr; ePos[i * 3 + 1] = H * (0.15 + rnd() * 0.6); ePos[i * 3 + 2] = Math.sin(a) * rr;
      const up = (0.5 + rnd() * 1.4) * (0.35 + 0.65 * Math.sqrt(Math.max(P.g, 0.02)));
      eVel[i * 3] = (rnd() - 0.5) * 0.7; eVel[i * 3 + 1] = up; eVel[i * 3 + 2] = (rnd() - 0.5) * 0.7;
    }
  };
  for (let i = 0; i < NE; i++) spawnEmber(i, true);

  const update: HyperFire["update"] = (dt, t, camera, px) => {
    if (pose) {
      // the chamber engine owns the geometry: scale the flame to its reaction-zone radius and sit it on the droplet
      const s = Math.max(0.05, pose.radius / Math.max(0.05, Rs));
      curScale = s;
      group.scale.setScalar(s);
      const base = (1 - tear) * (pose.zoneY - Rs * s) + tear * (pose.dropletY - 0.12 * s);
      const y0local = (1 - tear) * (0.78 - Rs) * 1;
      group.position.y = base - y0local * s;
      smokeMat.uniforms.uScale.value = s;
      emberMat.uniforms.uScale.value = s;
      light.distance = 26 * s;
    }
    // life cycle: a flame that the data says goes out burns, shrinks to a glowing ember bed, then relights
    if (extLife !== null) {
      life = extLife;
    } else if (P.fate === "extinguish") {
      cycleT += dt;
      const T = 14;
      const c = cycleT % T;
      life = c < 6.5 ? 1 : c < 8.8 ? 1 - (c - 6.5) / 2.3 : c < 11.5 ? 0 : Math.min(1, (c - 11.5) / 0.6);
      if (forceRelight > 0) { forceRelight -= dt; life = 1; }
    } else {
      life = P.fate === "unknown" ? 0.9 : 1;
      cycleT = 0;
    }
    const lp = smoothClamp(life, 0, 1);
    const flicker = 0.88 + 0.12 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1.1) + 0.06 * Math.sin(t * 31.7);

    const U = flameMat.uniforms;
    U.uTime.value = t;
    U.uTear.value = tear;
    U.uO2.value = o2n;
    U.uSoot.value = soot;
    U.uBlue.value = (P.fuel === "methanol" ? 0.5 : 0.12) * (0.65 + 0.35 * o2n);
    const sizeK = 0.30 + 0.70 * Math.pow(lp, 0.7);
    U.uH.value = Math.max(0.05, H * sizeK);
    U.uR0.value = R0 * (0.5 + 0.5 * sizeK);
    U.uRs.value = Rs * (0.4 + 0.6 * sizeK);
    U.uYc.value = isPan ? Rs * (0.4 + 0.6 * sizeK) : 0.78;
    U.uRise.value = 0.35 + 1.15 * Math.sqrt(Math.max(P.g, 0));
    U.uTurb.value = (0.022 + 0.26 * Math.pow(tear, 1.3)) * (P.fuel === "heptane" ? 1.12 : 1);
    U.uGain.value = 17 * (0.55 + 0.62 * o2n) * Math.pow(lp, 1.6) * (0.92 + 0.08 * flicker);
    (U.uWind.value as THREE.Vector3).copy(wind).multiplyScalar(0.25);
    group.updateMatrixWorld();
    flameMesh.worldToLocal((U.uCam.value as THREE.Vector3).copy(camera.position));
    flameMesh.visible = lp > 0.002;

    // light
    light.intensity = (5 + 12 * o2n) * lightK * Math.pow(lp, 1.4) * flicker * curScale * curScale;
    light.color.setRGB(1, 0.50 + 0.22 * (1 - tear) + 0.10 * o2n, 0.20 + 0.55 * (1 - tear) + 0.10 * o2n);
    light.position.set(0, (isPan ? 0 : 0.78) * (1 - tear) + (0.35 + 0.35 * H) * tear + (isPan ? (1 - tear) * Rs : 0), 0);

    // smoke
    smokeMat.uniforms.uPx.value = px;
    smokeMat.uniforms.uAlpha.value = (0.10 + 0.85 * smokeAmt) * (0.35 + 0.65 * lp + (life < 0.2 ? 0.35 : 0));
    smokeMat.uniforms.uGlow.value = lp * (0.2 + 0.8 * tear);
    for (let i = 0; i < NS; i++) {
      sAge[i] += dt / sLife[i];
      if (sAge[i] >= 1) { spawnSmoke(i, false); continue; }
      const buoy = 0.5 * Math.sqrt(Math.max(P.g, 0)) * dt;
      sVel[i * 3 + 1] += buoy * 0.35;
      const damp = 1 - Math.min(0.9, dt * 0.55);
      sVel[i * 3] = sVel[i * 3] * damp + wind.x * 0.08 * dt + Math.sin(t * 0.8 + sSeed[i] * 20) * 0.02 * dt;
      sVel[i * 3 + 1] *= damp;
      sVel[i * 3 + 2] = sVel[i * 3 + 2] * damp + wind.z * 0.08 * dt + Math.cos(t * 0.7 + sSeed[i] * 17) * 0.02 * dt;
      sPos[i * 3] += sVel[i * 3] * dt;
      sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt;
      sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
      sSize[i] = sBase[i] * (0.55 + sAge[i] * 3.4);
    }
    (smokeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (smokeGeo.attributes.aAge as THREE.BufferAttribute).needsUpdate = true;
    (smokeGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (smokeGeo.attributes.aSeed as THREE.BufferAttribute).needsUpdate = true;

    // embers: a ballistic arc that follows the real gravity of the place
    emberMat.uniforms.uPx.value = px;
    const gAcc = 9.81 * Math.min(1, Math.max(0, P.g)) * 0.4;
    const burning = lp > 0.25;
    for (let i = 0; i < NE; i++) {
      eAge[i] += dt / eLife[i];
      if (eAge[i] >= 1) {
        if (burning) spawnEmber(i, false);
        else { eAge[i] = 1; eSize[i] = 0; }
        continue;
      }
      eVel[i * 3 + 1] -= gAcc * dt;
      eVel[i * 3] += (Math.sin(t * 3 + eSeed[i] * 40) * 0.5 + wind.x * 0.1) * dt;
      eVel[i * 3 + 2] += (Math.cos(t * 2.6 + eSeed[i] * 33) * 0.5 + wind.z * 0.1) * dt;
      ePos[i * 3] += eVel[i * 3] * dt;
      ePos[i * 3 + 1] += eVel[i * 3 + 1] * dt;
      ePos[i * 3 + 2] += eVel[i * 3 + 2] * dt;
      if (isPan && P.g > 0.05 && ePos[i * 3 + 1] < 0.02) { ePos[i * 3 + 1] = 0.02; eVel[i * 3 + 1] *= -0.25; eVel[i * 3] *= 0.7; eVel[i * 3 + 2] *= 0.7; }
    }
    (emberGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (emberGeo.attributes.aAge as THREE.BufferAttribute).needsUpdate = true;
    (emberGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    fuelGlow.emissiveIntensity = 0.15 + 1.2 * lp * flicker;
  };

  return {
    group,
    update,
    set: (p) => { P = p; derive(); },
    setPose: (radius, zoneY, dropletY = 0) => { pose = { radius, zoneY, dropletY }; },
    setLife: (v) => { extLife = v; },
    reignite: () => { cycleT = 0; forceRelight = 6; },
    dispose: () => {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) mat.dispose();
      });
    },
  };
}
