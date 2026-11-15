import * as THREE from "three";
import type { SceneApi } from "@/components/ImmersiveScene";

/**
 * Level B visual of a rupture: one flash that decays (no flicker), an expanding shock ring, a fireball and instanced
 * fragments. The decision that a rupture happens comes from lib/componentSpread (level A); this class only draws it.
 *
 * Performance: one InstancedMesh for the fragments, no new WebGL scene. Accessibility: with prefers-reduced-motion it
 * shows a static ring and no movement; no camera shake, no repeated flashes, no sound.
 * HONESTY: illustrative only. It is not a model of blast physics and the UI labels it as simulated.
 */
const FRAGMENTS = 36;
const LIFE = 2.2; // seconds

export class LabBlast {
  private group = new THREE.Group();
  private flash: THREE.Mesh;
  private ring: THREE.Mesh;
  private fireball: THREE.Mesh;
  private frags: THREE.InstancedMesh;
  private vel: THREE.Vector3[] = [];
  private age = -1;
  private reduced: boolean;
  private radius: number;
  private disposed = false;
  private tmp = new THREE.Object3D();

  /** `radius` is the declared blast radius in scene units (about metres) */
  private api: SceneApi;

  constructor(api: SceneApi, radius: number) {
    this.api = api;
    this.radius = radius;
    this.reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c0, opacity: 0, ...add }));
    this.fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff7a1a, opacity: 0, ...add }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, side: THREE.DoubleSide, ...add }));
    this.frags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xffb060 }), FRAGMENTS);
    this.frags.visible = false;
    this.group.visible = false;
    this.group.add(this.flash, this.fireball, this.ring, this.frags);
    api.scene.add(this.group);
    api.ignore.push(this.group); // the scene's pointer picking must not hit the effect
    for (let i = 0; i < FRAGMENTS; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.25 + Math.random() * 0.5);
      this.vel.push(v);
    }
    api.addUpdater((dt) => this.update(dt));
  }

  /** `at` is where the effect is drawn (world space) */
  trigger(at: THREE.Vector3) {
    if (this.disposed) return;
    this.group.position.copy(at);
    this.group.visible = true;
    this.age = 0;
    this.frags.visible = !this.reduced;
    this.draw();
  }

  clear() {
    this.age = -1;
    this.group.visible = false;
  }

  private draw() {
    const k = Math.min(1, this.age / LIFE);
    const R = this.radius;
    if (this.reduced) {
      // static, no motion: a ring at the declared radius and a steady glow that fades out once
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      this.ring.scale.setScalar(R);
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 0.25 * (1 - k);
      this.flash.scale.setScalar(R * 0.5);
      (this.fireball.material as THREE.MeshBasicMaterial).opacity = 0;
      return;
    }
    // one flash that only decays (a single pulse, never a flicker)
    (this.flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - this.age / 0.35) * 0.9;
    this.flash.scale.setScalar(R * (0.15 + this.age * 0.8));
    // fireball and shock ring grow, then fade
    (this.fireball.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k) * 0.55;
    this.fireball.scale.setScalar(R * (0.2 + 0.8 * Math.sqrt(k)));
    (this.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k) * 0.7;
    this.ring.scale.setScalar(R * (0.1 + 1.4 * k));
    this.ring.lookAt(this.api.camera.position);
    for (let i = 0; i < FRAGMENTS; i++) {
      this.tmp.position.copy(this.vel[i]).multiplyScalar(this.age * 1.4);
      this.tmp.position.y -= 0.0; // microgravity: no fall
      this.tmp.scale.setScalar(Math.max(0.001, 1 - k));
      this.tmp.updateMatrix();
      this.frags.setMatrixAt(i, this.tmp.matrix);
    }
    this.frags.instanceMatrix.needsUpdate = true;
  }

  private update(dt: number) {
    if (this.disposed || this.age < 0) return;
    this.age += dt;
    if (this.age > LIFE) { this.group.visible = false; this.age = -1; return; }
    this.draw();
  }

  dispose() {
    this.disposed = true;
    this.api.scene.remove(this.group);
    const i = this.api.ignore.indexOf(this.group);
    if (i >= 0) this.api.ignore.splice(i, 1);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
  }
}
