"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { gl } from "@/lib/sceneKit";
import { COMPONENT_ENVS } from "@/lib/componentEnvs";

/**
 * DEV ONLY (route answers 404 in production). Lists every mesh of a GLB with its material, highlights the chosen one in 3D (the rest
 * ghosted), lets you assign a componentId / "ignore" per row and exports the sidecar map (data/components/<env>.map.json).
 * Nothing is uploaded and no GLB is modified. Open: http://localhost:<port>/dev-label?model=iss
 */
const MODELS: Record<string, { url: string; env: string }> = {
  iss: { url: "/models/iss_hd.glb", env: "iss" },
  emu: { url: "/models/emu.glb", env: "suit" },
};
interface Row { i: number; mesh: THREE.Mesh; name: string; material: string }
const keyOf = (r: { name: string; material: string }, byMesh: boolean) => (!byMesh && r.material ? `material:${r.material}` : `mesh:${r.name}`);

export default function LabelTool() {
  const [model] = useState(() => (typeof window === "undefined" ? "iss" : new URLSearchParams(location.search).get("model") ?? "iss"));
  const cfg = MODELS[model] ?? MODELS.iss;
  const catalog = COMPONENT_ENVS[cfg.env]?.catalog;
  const host = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [assign, setAssign] = useState<Record<number, string>>({});
  const [byMesh, setByMesh] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState("loading…");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x15171c);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.4));
    const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
    const controls = new OrbitControls(cam, renderer.domElement);
    let raf = 0, dead = false;
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    resize();
    addEventListener("resize", resize);
    gl.loadAsync(cfg.url).then((g) => {
      if (dead) return;
      scene.add(g.scene);
      const rs: Row[] = [];
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.userData.orig = m.material;
        const mat = Array.isArray(m.material) ? m.material[0] : m.material;
        rs.push({ i: rs.length, mesh: m, name: m.name || (m.parent?.name ?? ""), material: mat?.name ?? "" });
      });
      const box = new THREE.Box3().setFromObject(g.scene);
      const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()).length();
      cam.position.copy(c).add(new THREE.Vector3(0.6, 0.35, 1).multiplyScalar(s * 0.8));
      controls.target.copy(c);
      setRows(rs);
      setStatus(`${rs.length} meshes`);
    }, (e) => setStatus("load error: " + String(e)));
    const ray = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      const hit = ray.intersectObjects(scene.children, true).find((h) => (h.object as THREE.Mesh).isMesh);
      if (hit) setSel(rowsRef.current.find((x) => x.mesh === hit.object)?.i ?? null);
    };
    renderer.domElement.addEventListener("click", onClick);
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); };
    loop();
    return () => { dead = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); renderer.domElement.removeEventListener("click", onClick); renderer.dispose(); renderer.domElement.remove(); };
  }, [cfg.url]);

  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;

  // highlight the chosen mesh in magenta and ghost the others
  useEffect(() => {
    const hi = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const ghost = new THREE.MeshBasicMaterial({ color: 0x667788, transparent: true, opacity: 0.22, depthWrite: false });
    for (const r of rows) r.mesh.material = sel === null ? r.mesh.userData.orig : r.i === sel ? hi : ghost;
    return () => { hi.dispose(); ghost.dispose(); };
  }, [sel, rows]);

  const exportJson = () => {
    const entries: Record<string, string> = {}, ignored: Record<string, string> = {}, unidentified: string[] = [];
    for (const r of rows) {
      const a = assign[r.i];
      const k = keyOf(r, !!byMesh[r.i]);
      if (!a) { if (!unidentified.includes(k)) unidentified.push(k); } else if (a === "ignore") ignored[k] = "outside the pressurised volume or not a component (labelled by hand)"; else entries[k] = a;
    }
    const text = JSON.stringify({ env: cfg.env, model: cfg.url.split("/").pop(), method: "Manual labelling with the dev-label tool.", entries, ignored, unidentified }, null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${cfg.env}.map.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-black text-xs text-white">
      <div ref={host} className="h-full flex-1" />
      <div className="h-full w-[460px] overflow-auto border-l border-white/20 p-2 font-mono">
        <p className="mb-1 font-sans text-sm font-semibold">DEV ONLY · label tool · model={model} · {status}</p>
        <button onClick={exportJson} className="mb-2 rounded border border-white/40 px-2 py-1">Export {cfg.env}.map.json</button>
        <button onClick={() => setSel(null)} className="mb-2 ml-2 rounded border border-white/40 px-2 py-1">Clear highlight</button>
        <table className="w-full">
          <tbody>
            {rows.map((r) => (
              <tr key={r.i} className={r.i === sel ? "bg-fuchsia-900/60" : ""} onClick={() => setSel(r.i)}>
                <td className="pr-1 text-white/60">#{r.i}</td>
                <td className="pr-1">{r.name}<br /><span className="text-white/60">{r.material || "(no material)"}</span></td>
                <td>
                  <select value={assign[r.i] ?? ""} onChange={(e) => setAssign((a) => ({ ...a, [r.i]: e.target.value }))} className="w-40 bg-neutral-900">
                    <option value="">unidentified</option>
                    <option value="ignore">ignore (not a component)</option>
                    {catalog?.components.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                  <label className="ml-1"><input type="checkbox" checked={!!byMesh[r.i]} onChange={(e) => setByMesh((b) => ({ ...b, [r.i]: e.target.checked }))} />mesh</label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
