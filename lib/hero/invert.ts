import { AddEquation, Camera, CustomBlending, Group, Mesh, MultiplyBlending, OneFactor, OneMinusDstColorFactor, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial, Vector3, ZeroFactor } from "three";
import { LIT } from "./field";

/**
 * Spotlight color inversion. Anywhere on screen the gimbal's cone covers,
 * the frame inverts: out = mix(dst, 1-dst, m).
 *
 * Implemented as ONE extra draw call with a destination-reading blend —
 * no render target, no post pass, no stencil:
 *
 *     blendSrc = ONE_MINUS_DST_COLOR, blendDst = ONE_MINUS_SRC_ALPHA
 *     src = vec4(vec3(m), m)
 *     out = (1-dst)*m + dst*(1-m)  ==  mix(dst, 1-dst, m)
 *
 * m is an analytic ray-vs-cone coverage solved per fragment, so the
 * silhouette is antialiased for free (the discriminant feathers at the
 * exact screen-space edge). A second quad multiplies the inverted region
 * by the spotlight's warm tint so the wedge reads as paper, not monitor
 * white. The quad is fitted to the cone's screen bounding box each frame,
 * so fragments only run over the cone's footprint.
 */

const VERT = /* glsl */`
  uniform mat4 uInvProj;
  uniform mat4 uInvView;
  uniform vec2 uScale;
  uniform vec2 uOffset;
  varying vec3 vRay;
  void main() {
    vec2 ndc = position.xy * uScale + uOffset;
    vec4 p = uInvProj * vec4(ndc, 1.0, 1.0);
    vRay = mat3(uInvView) * (p.xyz / p.w);
    gl_Position = vec4(ndc, 0.0, 1.0);
  }
`;

const CONE = /* glsl */`
  uniform vec3 uApex;
  uniform vec3 uAxis;
  uniform vec3 uCam;
  uniform float uCos2;
  uniform float uRange;
  uniform float uM;
  varying vec3 vRay;

  float coverage() {
    vec3 d = normalize(vRay);
    vec3 co = uCam - uApex;
    float da = dot(d, uAxis);
    float ca = dot(co, uAxis);
    float A = da * da - uCos2;
    float B = 2.0 * (da * ca - dot(d, co) * uCos2);
    float C = ca * ca - dot(co, co) * uCos2;
    float disc = B * B - 4.0 * A * C;
    if (disc < 0.0) return 0.0;
    float sq = sqrt(disc);
    float t0 = (-B - sq) / (2.0 * A);
    float t1 = (-B + sq) / (2.0 * A);
    float m = 0.0;
    // accept a hit on the forward nappe within range; feather at the
    // silhouette (disc -> 0) and at the far cap
    for (int i = 0; i < 2; i++) {
      float t = i == 0 ? t0 : t1;
      if (t <= 0.0) continue;
      float h = ca + t * da;
      if (h < 0.0 || h > uRange) continue;
      float edge = smoothstep(0.0, 0.02 * abs(A) + 0.0004, disc * 0.25 / max(abs(A), 1e-4));
      float cap = smoothstep(uRange, uRange * 0.96, h);
      m = max(m, edge * cap);
    }
    return m;
  }
`;

export interface InvertPass {
  group: Group;
  /** per-frame update; strength 0..1 gates the whole effect */
  update(cam: Camera, apex: Vector3, axis: Vector3, range: number, spread: number, strength: number): void;
}

export function buildInvert(): InvertPass {
  const group = new Group();

  const uniforms = () => ({
    uInvProj: { value: null as unknown as object },
    uInvView: { value: null as unknown as object },
    uScale: { value: [1, 1] },
    uOffset: { value: [0, 0] },
    uApex: { value: new Vector3() },
    uAxis: { value: new Vector3(0, -1, 0) },
    uCam: { value: new Vector3() },
    uCos2: { value: 0.9 },
    uRange: { value: 3 },
    uM: { value: 0 },
  });

  const invMat = new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneMinusDstColorFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    uniforms: uniforms(),
    vertexShader: VERT,
    fragmentShader: /* glsl */`
      ${CONE}
      void main() {
        float m = coverage() * uM;
        if (m < 0.004) discard;
        gl_FragColor = vec4(vec3(m), m);
      }
    `,
  });

  const lit = (LIT >> 16 & 255) / 255;
  const litG = (LIT >> 8 & 255) / 255;
  const litB = (LIT & 255) / 255;
  const tintMat = new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: true,
    blending: MultiplyBlending,
    uniforms: uniforms(),
    vertexShader: VERT,
    fragmentShader: /* glsl */`
      ${CONE}
      void main() {
        float m = coverage() * uM;
        if (m < 0.004) discard;
        gl_FragColor = vec4(mix(vec3(1.0), vec3(${lit.toFixed(4)}, ${litG.toFixed(4)}, ${litB.toFixed(4)}), m), 1.0);
      }
    `,
  });

  const geo = new PlaneGeometry(2, 2);
  const invMesh = new Mesh(geo, invMat);
  const tintMesh = new Mesh(geo, tintMat);
  invMesh.frustumCulled = false;
  tintMesh.frustumCulled = false;
  invMesh.renderOrder = 998;
  tintMesh.renderOrder = 999;
  group.add(invMesh);
  group.add(tintMesh);
  group.visible = false;

  const p = new Vector3();
  const side = new Vector3();
  const up = new Vector3();
  const tmp = new Vector3();

  function update(cam: Camera, apex: Vector3, axis: Vector3, range: number, spread: number, strength: number): void {
    const on = strength > 0.01;
    if (group.visible !== on) group.visible = on;
    if (!on) return;

    // screen bbox: project the apex + 8 points of the base rim
    let lox = 2, loy = 2, hix = -2, hiy = -2;
    let behind = false;
    const acc = (v: Vector3) => {
      p.copy(v).project(cam);
      if (p.z > 1 || p.z < -1) behind = true;
      if (p.x < lox) lox = p.x;
      if (p.x > hix) hix = p.x;
      if (p.y < loy) loy = p.y;
      if (p.y > hiy) hiy = p.y;
    };
    acc(apex);
    // orthonormal basis around the axis
    side.set(1, 0, 0);
    if (Math.abs(axis.x) > 0.9) side.set(0, 0, 1);
    side.cross(axis).normalize();
    up.crossVectors(axis, side);
    const baseR = range * spread;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      tmp.copy(apex)
        .addScaledVector(axis, range)
        .addScaledVector(side, Math.cos(a) * baseR)
        .addScaledVector(up, Math.sin(a) * baseR);
      acc(tmp);
    }
    let sx: number, sy: number, ox: number, oy: number;
    if (behind) {
      sx = 1; sy = 1; ox = 0; oy = 0;   // camera inside/behind: full screen
    } else {
      const pad = 0.03;
      lox = Math.max(-1, lox - pad);
      hix = Math.min(1, hix + pad);
      loy = Math.max(-1, loy - pad);
      hiy = Math.min(1, hiy + pad);
      sx = Math.max(0, (hix - lox) / 2);
      sy = Math.max(0, (hiy - loy) / 2);
      ox = (hix + lox) / 2;
      oy = (hiy + loy) / 2;
    }
    const cos = Math.cos(Math.atan(spread));
    for (const mat of [invMat, tintMat]) {
      const u = mat.uniforms;
      u.uInvProj.value = cam.projectionMatrixInverse;
      u.uInvView.value = cam.matrixWorld;
      (u.uScale.value as number[])[0] = sx;
      (u.uScale.value as number[])[1] = sy;
      (u.uOffset.value as number[])[0] = ox;
      (u.uOffset.value as number[])[1] = oy;
      (u.uApex.value as Vector3).copy(apex);
      (u.uAxis.value as Vector3).copy(axis);
      (u.uCam.value as Vector3).copy((cam as Camera & { position: Vector3 }).position);
      u.uCos2.value = cos * cos;
      u.uRange.value = range;
      u.uM.value = strength;
    }
  }

  return { group, update };
}
