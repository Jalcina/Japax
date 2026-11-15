import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

// LabBlast only needs scene/ignore/addUpdater/camera; window is faked to flip prefers-reduced-motion
async function make(reduced) {
  globalThis.window = { matchMedia: () => ({ matches: reduced }) };
  const { LabBlast } = await import(`../lib/labBlast.ts?r=${reduced}`);
  const updaters = [];
  const api = { scene: new THREE.Scene(), ignore: [], camera: new THREE.PerspectiveCamera(), addUpdater: (f) => updaters.push(f) };
  const b = new LabBlast(api, 0.775);
  return { b, step: (dt) => updaters.forEach((u) => u(dt)), api };
}
const flashOp = (b) => b.flash.material.opacity;

test("normal motion: one flash that only decays (no flicker), fragments shown", async () => {
  const { b, step } = await make(false);
  b.trigger(new THREE.Vector3());
  assert.equal(b.frags.visible, true);
  const seq = [flashOp(b)];
  for (let i = 0; i < 100; i++) { step(1 / 60); seq.push(flashOp(b)); }
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] <= seq[i - 1] + 1e-9, `flash must be non-increasing at frame ${i}`);
  assert.equal(b.group.visible, true);
});

test("effect ends by itself after its life and leaves nothing visible", async () => {
  const { b, step } = await make(false);
  b.trigger(new THREE.Vector3());
  for (let i = 0; i < 200; i++) step(1 / 60);
  assert.equal(b.group.visible, false);
});

test("prefers-reduced-motion: no fragments, no fireball, static ring, no scale change over time", async () => {
  const { b, step } = await make(true);
  b.trigger(new THREE.Vector3());
  assert.equal(b.frags.visible, false);
  const s0 = b.ring.scale.x;
  for (let i = 0; i < 60; i++) step(1 / 60);
  assert.equal(b.ring.scale.x, s0);
  assert.equal(b.fireball.material.opacity, 0);
});

test("clear() and dispose() unhook the effect from the scene", async () => {
  const { b, api } = await make(false);
  b.trigger(new THREE.Vector3());
  b.clear();
  assert.equal(b.group.visible, false);
  b.dispose();
  assert.equal(api.scene.children.includes(b.group), false);
  assert.equal(api.ignore.includes(b.group), false);
});
