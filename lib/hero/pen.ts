import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, FrontSide, LineBasicMaterial, LineSegments, Material, Matrix4, ShaderMaterial, Side, Vector2, Vector3 } from "three";
import { NUM } from "../theme";

type V3 = [number, number, number];
type Plane = "xz" | "xy" | "yz";

/**
 * A tiny CAD-like line builder. Every world emits a handful of merged
 * LineSegments (one per material) instead of hundreds of objects,
 * so a whole detailed aircraft costs ~a dozen draw calls.
 *
 * Supports a transform stack so repeated assemblies (4 arms, 4 motors)
 * are authored once at the origin and stamped into place.
 */
export class Pen {
  v: number[] = [];
  private stack: Matrix4[] = [];
  private m = new Matrix4();
  private tmp = new Vector3();

  push(): this {
    this.stack.push(this.m.clone());
    return this;
  }

  pop(): this {
    this.m = this.stack.pop() ?? new Matrix4();
    return this;
  }

  translate(x: number, y: number, z: number): this {
    this.m.multiply(new Matrix4().makeTranslation(x, y, z));
    return this;
  }

  rotateY(rad: number): this {
    this.m.multiply(new Matrix4().makeRotationY(rad));
    return this;
  }

  rotateX(rad: number): this {
    this.m.multiply(new Matrix4().makeRotationX(rad));
    return this;
  }

  rotateZ(rad: number): this {
    this.m.multiply(new Matrix4().makeRotationZ(rad));
    return this;
  }

  scale(s: number): this {
    this.m.multiply(new Matrix4().makeScale(s, s, s));
    return this;
  }

  private xf(p: V3): V3 {
    this.tmp.set(p[0], p[1], p[2]).applyMatrix4(this.m);
    return [this.tmp.x, this.tmp.y, this.tmp.z];
  }

  seg(a: V3, b: V3): this {
    const A = this.xf(a);
    const B = this.xf(b);
    this.v.push(A[0], A[1], A[2], B[0], B[1], B[2]);
    return this;
  }

  poly(pts: V3[], close = false): this {
    for (let i = 0; i < pts.length - 1; i++) this.seg(pts[i], pts[i + 1]);
    if (close && pts.length > 2) this.seg(pts[pts.length - 1], pts[0]);
    return this;
  }

  /** Rectangle on a plane, centered at (cx,cy,cz). */
  rect(cx: number, cy: number, cz: number, w: number, h: number, plane: Plane = "xz"): this {
    const a = w / 2;
    const b = h / 2;
    let pts: V3[];
    if (plane === "xz") {
      pts = [[cx - a, cy, cz - b], [cx + a, cy, cz - b], [cx + a, cy, cz + b], [cx - a, cy, cz + b]];
    } else if (plane === "xy") {
      pts = [[cx - a, cy - b, cz], [cx + a, cy - b, cz], [cx + a, cy + b, cz], [cx - a, cy + b, cz]];
    } else {
      pts = [[cx, cy - a, cz - b], [cx, cy + a, cz - b], [cx, cy + a, cz + b], [cx, cy - a, cz + b]];
    }
    return this.poly(pts, true);
  }

  /** 12 edges of a box. */
  box(cx: number, cy: number, cz: number, w: number, h: number, d: number): this {
    const a = w / 2;
    const b = h / 2;
    const c = d / 2;
    const p: V3[] = [
      [cx - a, cy - b, cz - c], [cx + a, cy - b, cz - c], [cx + a, cy - b, cz + c], [cx - a, cy - b, cz + c],
      [cx - a, cy + b, cz - c], [cx + a, cy + b, cz - c], [cx + a, cy + b, cz + c], [cx - a, cy + b, cz + c],
    ];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [i, j] of e) this.seg(p[i], p[j]);
    return this;
  }

  circle(cx: number, cy: number, cz: number, r: number, plane: Plane = "xz", n = 24): this {
    const pts: V3[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const u = Math.cos(t) * r;
      const w = Math.sin(t) * r;
      if (plane === "xz") pts.push([cx + u, cy, cz + w]);
      else if (plane === "xy") pts.push([cx + u, cy + w, cz]);
      else pts.push([cx, cy + u, cz + w]);
    }
    return this.poly(pts, true);
  }

  arc(
    cx: number, cy: number, cz: number, r: number,
    a0: number, a1: number, plane: Plane = "xz", n = 20,
  ): this {
    const pts: V3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = a0 + ((a1 - a0) * i) / n;
      const u = Math.cos(t) * r;
      const w = Math.sin(t) * r;
      if (plane === "xz") pts.push([cx + u, cy, cz + w]);
      else if (plane === "xy") pts.push([cx + u, cy + w, cz]);
      else pts.push([cx, cy + u, cz + w]);
    }
    return this.poly(pts);
  }

  /** Cylinder as two rings plus rails — the workhorse for tubes and motor cans. */
  tube(
    cx: number, cy: number, cz: number,
    r: number, len: number, axis: "x" | "y" | "z" = "y",
    rings = 2, rails = 8, seg = 20,
  ): this {
    for (let k = 0; k < rings; k++) {
      const t = rings === 1 ? 0 : (k / (rings - 1) - 0.5) * len;
      if (axis === "y") this.circle(cx, cy + t, cz, r, "xz", seg);
      else if (axis === "x") this.circle(cx + t, cy, cz, r, "yz", seg);
      else this.circle(cx, cy, cz + t, r, "xy", seg);
    }
    for (let k = 0; k < rails; k++) {
      const a = (k / rails) * Math.PI * 2;
      const u = Math.cos(a) * r;
      const w = Math.sin(a) * r;
      if (axis === "y") this.seg([cx + u, cy - len / 2, cz + w], [cx + u, cy + len / 2, cz + w]);
      else if (axis === "x") this.seg([cx - len / 2, cy + u, cz + w], [cx + len / 2, cy + u, cz + w]);
      else this.seg([cx + u, cy + w, cz - len / 2], [cx + u, cy + w, cz + len / 2]);
    }
    return this;
  }

  /** Helix — the H-RTK F9P helical GNSS antenna is a real, drawable part. */
  helix(
    cx: number, cy: number, cz: number,
    r: number, len: number, turns: number, n = 60,
  ): this {
    const pts: V3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * Math.PI * 2 * turns;
      pts.push([cx + Math.cos(a) * r, cy + t * len, cz + Math.sin(a) * r]);
    }
    return this.poly(pts);
  }

  /**
   * Cross-hatch weave on a tube's surface — reads as carbon fibre at close
   * range. Every tick is a short chord confined to the surface, so the
   * pattern never throws stray lines across the drawing.
   */
  weave(
    cx: number, cy: number, cz: number,
    r: number, len: number, axis: "x" | "y" | "z",
    rows = 12, cols = 10,
  ): this {
    const at = (ang: number, along: number): V3 => {
      const u = Math.cos(ang) * r;
      const w = Math.sin(ang) * r;
      if (axis === "x") return [cx + along, cy + u, cz + w];
      if (axis === "y") return [cx + u, cy + along, cz + w];
      return [cx + u, cy + w, cz + along];
    };
    const dAlong = len / rows;
    const dAng = (Math.PI * 2) / cols;
    for (let i = 0; i < rows; i++) {
      const a0 = -len / 2 + i * dAlong;
      for (let k = 0; k < cols; k++) {
        const ang = k * dAng;
        // one tick each way: a plain-weave crossing
        this.seg(at(ang, a0), at(ang + dAng * 0.55, a0 + dAlong * 0.55));
        this.seg(at(ang + dAng * 0.55, a0), at(ang, a0 + dAlong * 0.55));
      }
    }
    return this;
  }

  /** Flat grid on the xz plane. */
  grid(cx: number, cz: number, size: number, div: number, y = 0): this {
    const h = size / 2;
    for (let i = 0; i <= div; i++) {
      const t = -h + (size * i) / div;
      this.seg([cx - h, y, cz + t], [cx + h, y, cz + t]);
      this.seg([cx + t, y, cz - h], [cx + t, y, cz + h]);
    }
    return this;
  }

  /** Survey cross — the house "registration" mark in 3D. */
  cross(cx: number, cy: number, cz: number, s: number): this {
    this.seg([cx - s, cy, cz], [cx + s, cy, cz]);
    this.seg([cx, cy, cz - s], [cx, cy, cz + s]);
    return this;
  }

  /** Dimension line with end ticks — the annotation vocabulary, in 3D. */
  dim(a: V3, b: V3, tick = 0.04): this {
    this.seg(a, b);
    const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const up = Math.abs(d.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const perp = new Vector3().crossVectors(d, up).normalize().multiplyScalar(tick);
    this.seg([a[0] - perp.x, a[1] - perp.y, a[2] - perp.z], [a[0] + perp.x, a[1] + perp.y, a[2] + perp.z]);
    this.seg([b[0] - perp.x, b[1] - perp.y, b[2] - perp.z], [b[0] + perp.x, b[1] + perp.y, b[2] + perp.z]);
    return this;
  }

  count(): number {
    return this.v.length / 6;
  }

  lines(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.v, 3));
    return g;
  }
}

/** A material registered for non-destructive fading. */
export interface FadeMat {
  m: Material & { opacity: number; color?: Color };
  base: number;
  tag?: string;
  /**
   * Which named subsystem this material belongs to — finer than `tag`, which
   * groups several parts under one lighting envelope. The Ladybug explorer
   * isolates by this, so "arm" and "leg" can be picked apart even though both
   * light as shell.
   */
  part?: string;
  /** translucent fresnel fill: waits for the boot fade before it blends in */
  fill?: boolean;
  /** opaque solid shading: dims toward a floor instead of vanishing */
  solid?: boolean;
}

/**
 * How bright a material should be given its subsystem's focus level.
 *
 * Line art can go to zero when its subsystem is not the subject — the drawing
 * simply stops mentioning it. Solid geometry cannot: an aircraft with a
 * missing arm reads as broken, not as unfocused. So solid materials fall to a
 * floor, which is what "dimmed" actually means for a lit surface.
 */
export function fadeLevel(fm: FadeMat, dim: number, boot: number, floor = 0.45): number {
  if (fm.solid) return fm.base * (floor + (1 - floor) * dim) * boot;
  return fm.base * dim * (fm.fill ? boot : 1);
}

/**
 * Fresnel-shaded translucent fill: the "holographic surface" under the line
 * work. Faces glow at grazing angles and stay near-transparent face-on, so
 * volumes read as shaded glass without any lights or textures.
 */
export function makeFresnelMat(color: number, opacity: number, tag?: string, side: Side = DoubleSide, frCap = 1): FadeMat {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(color) },
      uO: { value: opacity },
      uCap: { value: frCap },
    },
    vertexShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uO;
      uniform float uCap;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        // uCap tames the grazing-angle blowout: large thin plates seen
        // edge-on would otherwise flare into a solid sheet
        float fr = min(pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2), uCap);
        vec3 c = mix(uColor * 0.45, mix(uColor, vec3(1.0), 0.35), fr);
        gl_FragColor = vec4(c, uO * (0.22 + 0.78 * fr));
      }
    `,
  });
  // The frame loop drives every FadeMat via `.opacity`; alias it to the
  // shader uniform so fills fade exactly like the line work.
  Object.defineProperty(m, "opacity", {
    get: () => m.uniforms.uO.value,
    set: (v: number) => { m.uniforms.uO.value = v; },
  });
  return { m: m as unknown as FadeMat["m"], base: opacity, tag, fill: true };
}

/**
 * Vertex-colored line material for the CAD pack: the extractor bakes a
 * per-edge light response into vertex colors, so the real geometry renders
 * with genuine shading at LineBasicMaterial cost.
 */
export function makeCadMat(opacity: number, tag?: string): FadeMat {
  const m = new LineBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return { m, base: opacity, tag };
}

// ---------------------------------------------------------------------------
// Solid shading — flat illustration, not photoreal
// ---------------------------------------------------------------------------

/**
 * The light rig, in world space, shared by every solid material so the whole
 * airframe agrees about where the light is.
 *
 *   KEY   high and forward-left. It does NOT produce a highlight — it decides
 *         which of the flat tone bands a surface lands in, and which edges
 *         catch the warm edge light.
 *   FILL  low from the opposite side; it only lifts the darkest band a little
 *         so the shadow side keeps a readable silhouette against black.
 *
 * There is no specular lobe anywhere. The look is a technical illustration:
 * large flat fills, a small number of tonal steps, and one hard warm stroke
 * along the lit edge of every form. Gloss would fight all three.
 */
export const RIG = {
  keyDir: new Vector3(-0.46, 0.78, 0.42).normalize(),
  fillDir: new Vector3(0.82, -0.12, -0.56).normalize(),
};

export const rigUniforms = {
  uKeyDir: { value: RIG.keyDir },
  uFillDir: { value: RIG.fillDir },
  // The tone ramp: shadow -> mid -> lit. Three flat greys, nothing between.
  // Pitched brighter than a reference sitting on mid-grey paper would be —
  // this aircraft sits on pitch black, and the shadow band has to stay clearly
  // above the background or the silhouette dissolves into it.
  // The ramp is now three SCALAR levels, not three greys: value comes from
  // the band, colour comes from each subsystem's own albedo. That separation
  // is what lets white props and black arms share one light rig and still
  // land in the same illustration.
  uR0: { value: 0.10 },
  uR1: { value: 0.34 },
  uR2: { value: 0.78 },
  /** the sun's own colour, and the cool sky it reflects */
  uSunCol: { value: new Color(0xffe6c8) },
  uSkyCol: { value: new Color(0x2c3b52) },
  /** the warm edge light — the one bright thing in the frame */
  uEdgeCol: { value: new Color(0xf7cfae) },
  /** brand gradient mixed into the edge by world height, so it stays ours */
  uEdgeLo: { value: new Color(0xce2a7f) },
  uEdgeHi: { value: new Color(0x0eabcd) },
  uFog: { value: new Vector2(6, 15) },
  /** the page ground — what fog and the fade both resolve to */
  uBg: { value: new Color(NUM.bg) },
  /** global exposure — the mission drives this, not per-material opacity */
  uExp: { value: 1 },
};

const SOLID_VERT = /* glsl */`
  uniform vec3 uQS;
  uniform vec3 uQO;
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vCol;
  varying float vAO;
  attribute float aAO;
  void main() {
    // int16 -> scene units. Procedural geometry ships real floats and gets
    // scale 1 / offset 0, so one code path covers both.
    vec4 wp = modelMatrix * vec4(position * uQS + uQO, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vCol = color;
    vAO = aAO;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SOLID_FRAG = /* glsl */`
  uniform vec3 uKeyDir, uFillDir;
  uniform vec3 uAlbedo;
  uniform float uR0, uR1, uR2;
  uniform vec3 uEdgeCol, uEdgeLo, uEdgeHi;
  uniform vec2 uFog;
  uniform vec3 uSunCol, uSkyCol, uBg;
  uniform float uExp, uO, uAlpha, uEdge, uBrand, uTone, uHue;
  uniform float uSun, uSunT, uShine, uReflect, uWeave, uWeaveScale;
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vCol;
  varying float vAO;

  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vW);

    // ---- tone banding -----------------------------------------------------
    // Two narrow smoothsteps instead of a gradient: the transitions are only
    // wide enough to antialias, so each face reads as one flat fill. The fill
    // light rides along inside the same ramp rather than adding a second
    // gradient, which would reintroduce the roundness the style rejects.
    float key = dot(N, uKeyDir);
    float fill = max(dot(N, uFillDir), 0.0) * 0.22;
    float k = key + fill;
    float b1 = smoothstep(-0.16, 0.02, k);
    float b2 = smoothstep(0.30, 0.50, k);
    float band = mix(mix(uR0, uR1, b1), uR2, b2);

    // Albedo is the subsystem's own value — white props, black arms, white
    // cases — modulated by the packed Onshape part colour where a group is
    // genuinely multi-coloured (the avionics stack, the battery wrap).
    vec3 tone = uAlbedo * mix(vec3(1.0), vCol, uHue) * band;
    tone *= mix(1.0, 0.5 + 0.5 * vAO, uTone);

    // ---- carbon fibre --------------------------------------------------
    // A 2x2 twill, generated rather than textured: the arms, legs, plates and
    // blades are all woven prepreg, and a weave is the one detail that says
    // "carbon" instantly. Coordinates come from a triplanar projection of the
    // world position, so no part needs UVs and the tow direction stays
    // consistent across a tube's whole circumference.
    if (uWeave > 0.0) {
      vec3 an = abs(N);
      vec2 uv = (an.y > an.x && an.y > an.z) ? vW.xz : (an.x > an.z ? vW.zy : vW.xy);
      uv *= uWeaveScale;
      vec2 cell = floor(uv);
      vec2 f = fract(uv) - 0.5;
      // Alternate the tow direction per cell — that checker IS the twill —
      // and shade each block with a smooth sinusoid rather than a triangle
      // wave. A triangle wave puts a hard crease down every tow and turns the
      // whole surface into argyle; a sinusoid reads as round fibres catching
      // light, which is what a weave actually looks like.
      float diag = mod(cell.x + cell.y, 2.0) < 0.5 ? (f.x + f.y) : (f.x - f.y);
      float tow = 0.5 + 0.5 * sin(diag * 12.566);
      // Fade the weave out once a cell is near pixel-size, or it aliases into
      // crawling moire the moment the aircraft moves.
      float fade = 1.0 - smoothstep(0.12, 0.5, max(fwidth(uv.x), fwidth(uv.y)));
      tone *= 1.0 + (tow - 0.5) * uWeave * fade;
    }

    // ---- the warm edge light ---------------------------------------------
    // A constant-WIDTH silhouette stroke, measured in PIXELS. Thresholding a
    // fresnel term instead — the obvious way — smears across every flat plate
    // seen at a grazing angle, which is most of an airframe made of plates.
    // Dividing by the screen-space derivative asks the only question that
    // matters, "how many pixels away is the silhouette": a flat plate edge-on
    // has a grazing but CONSTANT facing ratio, so it gets nothing, while a
    // curved edge gets a clean line of the same weight wherever it appears.
    // Gated by the key so only edges facing the light catch it — otherwise it
    // reads as an outline traced around everything rather than as light.
    float g = abs(dot(N, V));
    float w = max(uEdge, 0.0) * 1.9;
    float rim = (1.0 - smoothstep(w, w + 1.7, g / max(fwidth(g), 1e-5)))
      * smoothstep(-0.30, 0.30, key);
    vec3 edge = mix(uEdgeCol, mix(uEdgeLo, uEdgeHi, clamp((vW.y + 0.55) / 1.25, 0.0, 1.0)), uBrand);
    vec3 c = mix(tone, edge, clamp(rim, 0.0, 1.0));

    // ---- the sun ----------------------------------------------------------
    // A hard-edged specular PATCH, not a soft highlight: the half-vector lobe
    // is thresholded the same way the tone ramp is, so the sun lands as a
    // flat shape with a crisp boundary that belongs to the illustration. Its
    // threshold rides on the surface's own facing ratio, which is what makes
    // it crawl across a rotating part instead of sitting there like a decal.
    vec3 H = normalize(uKeyDir + V);
    float lobe = pow(max(dot(N, H), 0.0), uShine);
    float sun = smoothstep(uSunT, uSunT + 0.06, lobe) * step(0.0, key);
    c = mix(c, uSunCol, clamp(sun * uSun, 0.0, 1.0));

    // ---- the sky it sits under --------------------------------------------
    // One more banded term off the reflection vector: faces angled up catch a
    // cool sheen, faces angled down stay dry. Two flat steps, so it reads as
    // reflected environment rather than as another light.
    float sky = smoothstep(0.05, 0.55, reflect(-V, N).y);
    c += uSkyCol * (0.35 + 0.65 * smoothstep(0.45, 0.55, sky)) * sky * uReflect * vAO;

    c *= uExp;
    // Fog and fade both resolve to the GROUND colour, not to zero. The ground
    // is no longer #000, so multiplying toward black would sink a faded or
    // distant part below the background instead of into it — a dark ghost of
    // the silhouette exactly where nothing should be.
    c = mix(c, uBg, smoothstep(uFog.x, uFog.y, length(cameraPosition - vW)));
    // uO fades toward the ground and keeps the surface OPAQUE — the mission's
    // way of receding a subsystem. uAlpha is the separate, rarer case: the
    // explorer ghosting everything except the part you asked to see, where the
    // point is precisely that you can look THROUGH the shell at what is inside.
    gl_FragColor = vec4(mix(uBg, c, uO), uAlpha);
  }
`;

/** Flat-colour pass used only for GPU picking: dequantize, project, emit id. */
const PICK_VERT = /* glsl */`
  uniform vec3 uQS;
  uniform vec3 uQO;
  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position * uQS + uQO, 1.0);
  }
`;

const PICK_FRAG = /* glsl */`
  uniform vec3 uId;
  void main() { gl_FragColor = vec4(uId, 1.0); }
`;

export interface SolidOpts {
  /** the subsystem's own base colour: white props, black arms, white cases */
  albedo?: number;
  /** width of the warm edge stroke, in device pixels */
  edge?: number;
  /** strength of the hard-edged sun patch */
  sun?: number;
  /** how tight that patch is: higher = smaller, sharper glint */
  shine?: number;
  /** strength of the banded sky reflection */
  reflect?: number;
  /** how much brand gradient is mixed into the edge colour */
  brand?: number;
  /** how much baked occlusion darkens the flat fills */
  tone?: number;
  /** how much of the CAD part colour survives into the greys */
  hue?: number;
  /** carbon-fibre twill depth; 0 for machined or moulded parts */
  weave?: number;
  /** twill cells per scene unit */
  weaveScale?: number;
  /** overall level, before the mission's fade */
  level?: number;
  /** int16 dequantization for packed CAD groups: world = pos * qs + qo */
  quant?: { qs: number[], qo: number[] };
}

/**
 * Flat-shaded material for the decimated CAD packs.
 *
 * It is OPAQUE — no blending, depth writes on — which is what makes a solid
 * aircraft read as solid. Fading still works because the background is pitch
 * black: `opacity` scales the emitted colour, so fading to zero and fading to
 * the background are the same operation. That keeps the FadeMat contract the
 * mission timeline drives, with none of the sorting cost of transparency.
 *
 * Everything is authored and composited directly in sRGB. There is no
 * linearization and no tone mapping, because there is no light transport to
 * be physical about — the tones are picked, not computed, and any tonemap
 * would just drift them off the values chosen here.
 */
export function makeSolidMat(opacity: number, tag?: string, o: SolidOpts = {}): FadeMat {
  const m = new ShaderMaterial({
    vertexColors: true,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: FrontSide,
    uniforms: {
      ...rigUniforms,
      uAlbedo: { value: new Color(o.albedo ?? 0xffffff) },
      uQS: { value: new Vector3(...(o.quant ? o.quant.qs : [1, 1, 1])) },
      uQO: { value: new Vector3(...(o.quant ? o.quant.qo : [0, 0, 0])) },
      uO: { value: opacity * (o.level ?? 1) },
      uAlpha: { value: 1 },
      uEdge: { value: o.edge ?? 1.5 },
      uSun: { value: o.sun ?? 0.85 },
      uSunT: { value: 0.55 },
      uShine: { value: o.shine ?? 22 },
      uReflect: { value: o.reflect ?? 0.5 },
      uWeave: { value: o.weave ?? 0 },
      uWeaveScale: { value: o.weaveScale ?? 150 },
      uBrand: { value: o.brand ?? 0.22 },
      uTone: { value: o.tone ?? 1 },
      uHue: { value: o.hue ?? 0.2 },
    },
    vertexShader: SOLID_VERT,
    fragmentShader: SOLID_FRAG,
  });
  const level = o.level ?? 1;
  Object.defineProperty(m, "opacity", {
    get: () => m.uniforms.uO.value / level,
    set: (v: number) => { m.uniforms.uO.value = v * level; },
  });
  return { m: m as unknown as FadeMat["m"], base: opacity, tag, solid: true };
}

/**
 * Ghosts a solid material, or restores it.
 *
 * A solid material is opaque by construction — that is what makes the airframe
 * read as a machine rather than as glass. Going translucent therefore has to
 * move it into the transparent render bucket and stop it writing depth, which
 * is a state change, not a uniform tweak. It happens on selection only, never
 * per frame, so the shader recompile it costs is paid a handful of times.
 */
export function setSolidAlpha(fm: FadeMat, alpha: number): void {
  const m = fm.m as unknown as ShaderMaterial;
  if (!m.uniforms?.uAlpha) return;
  m.uniforms.uAlpha.value = alpha;
  const ghost = alpha < 0.999;
  if (m.transparent === ghost) return;
  m.transparent = ghost;
  m.depthWrite = !ghost;
  m.needsUpdate = true;
}

/**
 * A material that renders one flat colour, for reading which subsystem is
 * under the cursor out of a 1x1 render target.
 *
 * CPU raycasting is not an option here: the CAD ships int16 positions that are
 * dequantized in the vertex shader, so `geometry.attributes.position` holds
 * quantized integers and every ray test would miss. Asking the GPU — which
 * already knows how to place these vertices — is both exact and cheaper than
 * expanding 200k triangles to floats just to hit-test them.
 */
export function makePickMat(id: number, quant?: { qs: number[], qo: number[] }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uQS: { value: new Vector3(...(quant ? quant.qs : [1, 1, 1])) },
      uQO: { value: new Vector3(...(quant ? quant.qo : [0, 0, 0])) },
      // ids ride in the red channel as whole bytes: exact after the
      // framebuffer round-trip, where a packed float would not be
      uId: { value: new Color(id / 255, 0, 0) },
    },
    vertexShader: PICK_VERT,
    fragmentShader: PICK_FRAG,
    side: FrontSide,
  });
}

export function makeMat(color: number, opacity: number, tag?: string): FadeMat {
  const m = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    // additive on pitch black: overlapping strokes bloom instead of clip,
    // which is what makes the line art glow
    blending: AdditiveBlending,
  });
  return { m, base: opacity, tag };
}
