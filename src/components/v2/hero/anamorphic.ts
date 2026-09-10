/**
 * True anamorphic projection (brief §19/§20). The LED corner does NOT show a
 * model that physically crosses a wall. Instead:
 *   1. a virtual content scene (a primitive now, the animal at Gate 4) is
 *      rendered from the fixed SWEET-SPOT camera into a texture;
 *   2. that texture is projective-mapped onto the physical LED planes using the
 *      sweet-spot camera's view-projection.
 * A viewer AT the sweet spot sees a coherent 3D object that appears to sit in
 * space beyond/through the LED; OFF-AXIS the flat projected image on the angled
 * panels distorts — the proof the geometry is real, not faked.
 */

// vertex: render the panel from the ACTUAL camera, but also compute where each
// world point lands in the SWEET-SPOT camera (projective coords).
export const anamorphicVertex = /* glsl */ `
  uniform mat4 uSweetVP;
  varying vec4 vProj;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vProj = uSweetVP * world;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const anamorphicFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec3 uOff;   // LED "off" colour (faint panel glow)
  varying vec4 vProj;
  void main() {
    vec2 uv = vProj.xy / vProj.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(uOff, 1.0);
      return;
    }
    vec3 c = texture2D(uTex, uv).rgb;
    gl_FragColor = vec4(c, 1.0);
  }
`;
