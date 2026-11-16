import * as THREE from "three";

/**
 * A rectangular soft emitter, described exactly like THREE.RectAreaLight
 * (position, aim, width, height, colour, luminance), rendered by one soft
 * SpotLight.
 *
 * Why not RectAreaLight: every area light adds an LTC evaluation to the shader
 * of every lit material, whether or not it is switched on. Chrome and Edge on
 * Windows compile WebGL through Direct3D, where six area lights made each of
 * the venue's ~220 programs about seven times slower to compile — roughly 80 s
 * of frozen loader on a first visit. A spot light costs a few shader lines.
 *
 * Calibration: the spot is aimed at the panel's look-at point and its
 * intensity is set so the illuminance there equals the panel's (rectangle-to-
 * point form factor, E = π·L·F, against the punctual E = I/d²). For a small
 * panel this reduces to I = L·A, the Lambertian on-axis intensity. Output is
 * full across the panel's footprint and falls off smoothly to the horizon,
 * matching a Lambertian emitter's half-intensity at 60°.
 */
export class AreaPanel extends THREE.Object3D {
  width: number;
  height: number;
  /** Luminance, as RectAreaLight.intensity. */
  intensity: number;
  readonly color: THREE.Color;
  readonly aim = new THREE.Vector3(0, 0, -1);
  readonly spot: THREE.SpotLight;

  constructor(color: THREE.ColorRepresentation, intensity: number, width: number, height: number) {
    super();
    this.color = new THREE.Color(color);
    this.intensity = intensity;
    this.width = width;
    this.height = height;
    this.spot = new THREE.SpotLight(this.color, 0, 0, MAX_CONE, 1, 2);
    this.spot.castShadow = false;
    this.spot.name = "Area panel (soft spot)";
  }

  override lookAt(x: THREE.Vector3 | number, y?: number, z?: number): void {
    if (x instanceof THREE.Vector3) { this.aim.copy(x); super.lookAt(x); }
    else { this.aim.set(x, y ?? 0, z ?? 0); super.lookAt(x, y ?? 0, z ?? 0); }
  }

  /** Push this frame's panel description into the spot light. */
  sync() {
    const spot = this.spot;
    const d = Math.max(0.05, this.position.distanceTo(this.aim));
    const a = this.width / 2, b = this.height / 2;
    const X = a / d, Y = b / d;
    const sx = Math.sqrt(1 + X * X), sy = Math.sqrt(1 + Y * Y);
    const formFactor = (2 / Math.PI) * (X / sx * Math.atan(Y / sx) + Y / sy * Math.atan(X / sy));
    const illuminance = this.intensity * Math.PI * formFactor;
    // A large panel lights its footprint almost evenly, while a point at the
    // panel's centre would burn surfaces beside it (inverse square). Place the
    // virtual source as far back as the panel's corners are from the aim
    // point; a small panel stays where it is.
    const D = Math.sqrt(d * d + a * a + b * b);
    _dir.subVectors(this.aim, this.position).normalize();
    spot.position.copy(this.aim).addScaledVector(_dir, -D);
    spot.intensity = illuminance * D * D;
    spot.color.copy(this.color);
    spot.target.position.copy(this.aim);
    spot.target.updateMatrixWorld();
    // Full output inside the panel's footprint, then a smooth roll-off.
    const core = Math.atan(Math.sqrt(a * b) / D);
    spot.angle = MAX_CONE;
    spot.penumbra = THREE.MathUtils.clamp(1 - core / MAX_CONE, 0, 1);
  }

  dispose() {
    this.spot.dispose();
  }
}

const MAX_CONE = Math.PI / 2 - 0.02;
const _dir = new THREE.Vector3();
