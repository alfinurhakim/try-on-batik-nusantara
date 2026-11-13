/**
 * Kompositor WebGL2 try-on "kemeja batik".
 *
 * Semua dihitung dalam koordinat tubuh: titik nol = pangkal leher (tengah bahu),
 * 1 unit = lebar bahu, sumbu y ke bawah, ikut miring mengikuti garis bahu.
 *
 *  - pola batik rapat & simetris kiri-kanan, "membungkus" badan (mengecil di sisi tubuh)
 *  - kerah kemeja, placket & kancing, ornamen besar di dada
 *  - area kulit di dalam siluet kemeja (mis. leher V kaos) ikut tertutup
 *  - pencahayaan dari video asli yang dihaluskan + bayangan di tepi badan
 *
 * Tekstur mask RGBA: R = pakaian, G = kulit badan, B = kulit wajah (confidence 0..1).
 */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform sampler2D uMotifA;
uniform sampler2D uMotifB;
uniform sampler2D uOrnA;
uniform sampler2D uOrnB;
uniform vec2 uNeck[2];     // pangkal leher tiap orang (uv)
uniform float uAngle[2];
uniform float uScale[2];
uniform float uBodies;     // 1 atau 2 orang (mode berdua / sarimbit)
uniform sampler2D uBg;     // latar kota virtual
uniform float uBgOn;
uniform float uSplit;      // slider sebelum/sesudah (posisi x layar, 0..1; 0 = mati)
uniform float uAspect;
uniform float uDensityA;
uniform float uDensityB;
uniform float uMix;
uniform float uRefLum;
uniform float uDev;
uniform float uHasMask;
uniform float uCollar;
uniform float uOrnament;
uniform vec3 uTrimA;
uniform vec3 uTrimB;
uniform vec2 uVideoTexel;
uniform float uCollarY;   // geser kerah naik/turun (kalibrasi)
uniform float uFold;      // seberapa kuat lipatan baju asli ikut tampil (0 = rata, opak penuh)
uniform float uSleeve;    // lengan panjang: kulit lengan ikut tertutup kain
uniform vec3 uHands[4];   // tangan: pusat (uv) + jari-jari (satuan tinggi), z=0 → tidak terdeteksi

// kerah sisi kanan (x >= 0), satuan lebar bahu, y ke bawah
// garis bahu MediaPipe ada di sendi bahu, sedikit di bawah pangkal leher,
// jadi kerah dibuat naik melingkari leher dan ujungnya hanya sedikit turun.
const vec2 C0 = vec2(0.0, -0.01);   // titik temu kerah di depan
const vec2 C1 = vec2(0.135, -0.26); // sisi leher atas (kerah berdiri)
const vec2 C2 = vec2(0.225, -0.15); // sisi luar kerah
const vec2 C3 = vec2(0.085, 0.09);  // ujung kerah lancip ke bawah
const float WRAP_R = 0.55;          // "jari-jari" badan untuk efek melengkung
const float ORN_Y = 0.62;           // posisi ornamen dada
const float ORN_HALF = 0.6;         // setengah ukuran ornamen

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float edgeD(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  return dot(p - a, normalize(vec2(-e.y, e.x)));
}

vec3 garment(sampler2D motif, sampler2D orn, float dens, vec3 trim, vec2 b, float sx, float ax, float collarD, float inCollar) {
  vec3 col = texture(motif, vec2(sx, b.y) * dens).rgb;

  if (uOrnament > 0.5) {
    vec2 ou = vec2(sign(b.x) * sx, b.y - ORN_Y) / (2.0 * ORN_HALF) + 0.5;
    if (ou.x > 0.0 && ou.x < 1.0 && ou.y > 0.0 && ou.y < 1.0) {
      vec4 o = texture(orn, ou);
      col = mix(col, o.rgb, o.a);
    }
  }

  if (uCollar > 0.5) {
    // placket (lajur kancing)
    if (ax < 0.036 && b.y > C0.y) {
      col = texture(motif, vec2(b.x + 0.5, b.y) * dens).rgb * 0.92;
      col = mix(col, trim * 0.75, smoothstep(0.026, 0.031, ax) * 0.85);
      float by = b.y - 0.1;
      float k = floor(by / 0.21 + 0.5);
      if (k >= 0.0 && k < 6.0) {
        vec2 bp = vec2(b.x, by - k * 0.21);
        float r = length(bp);
        if (r < 0.021) {
          vec3 pearl = vec3(0.94, 0.91, 0.85);
          col = mix(pearl * 0.7, pearl, smoothstep(0.021, 0.013, r));
          float holes = step(length(bp - vec2(0.006, 0.0)), 0.0035) + step(length(bp + vec2(0.006, 0.0)), 0.0035);
          col *= 1.0 - holes * 0.45;
        }
      }
    }
    // bayangan kerah di atas kain
    float sh = smoothstep(-0.035, 0.0, collarD) * (1.0 - inCollar);
    col *= 1.0 - sh * 0.35;
    if (inCollar > 0.0) {
      vec3 cc = texture(motif, vec2(b.y, ax) * dens * 1.6).rgb * 0.86;
      float rim = 1.0 - smoothstep(0.005, 0.014, collarD);
      cc = mix(cc, trim, rim * 0.85);
      // jahitan tipis
      float stitch = smoothstep(0.018, 0.021, collarD) * (1.0 - smoothstep(0.021, 0.024, collarD));
      cc = mix(cc, vec3(0.95, 0.92, 0.86), stitch * 0.5);
      col = mix(col, cc, inCollar);
    }
  }
  return col;
}

float handDist(vec3 h) {
  if (h.z <= 0.0) return 1.0;
  vec2 d = vUv - h.xy;
  d.x *= uAspect;
  return length(d) - h.z;
}

vec2 bodyCoords(int i) {
  vec2 d = vUv - uNeck[i];
  d.x *= uAspect;
  float c = cos(uAngle[i]);
  float s = sin(uAngle[i]);
  return vec2(c * d.x + s * d.y, -s * d.x + c * d.y) / max(uScale[i], 0.02);
}

void main() {
  vec3 cam = texture(uVideo, vUv).rgb;
  vec4 mk = texture(uMask, vUv);
  // mask dibuat tegas (hampir biner) + sedikit dilebarkan supaya tidak ada bagian tembus
  float clothesConf = max(mk.r, textureLod(uMask, vUv, 1.0).r * 0.92);
  float clothes = smoothstep(0.22, 0.34, clothesConf) * uHasMask;
  float bodySkin = smoothstep(0.35, 0.5, mk.g) * uHasMask;
  float person = max(clothes, max(bodySkin, smoothstep(0.35, 0.5, mk.b) * uHasMask));

  // koordinat tubuh; di mode berdua tiap piksel ikut orang yang paling dekat
  vec2 b = bodyCoords(0);
  if (uBodies > 1.5) {
    vec2 b2 = bodyCoords(1);
    if (abs(b2.x) < abs(b.x)) b = b2;
  }
  b.y -= uCollarY;
  float ax = abs(b.x);

  // badan melengkung: pola memadat ke arah sisi tubuh
  float xn = ax / WRAP_R;
  float sx = xn < 0.95 ? WRAP_R * asin(xn) : WRAP_R * asin(0.95) + (ax - 0.95 * WRAP_R) * 3.2;
  float curve = xn < 1.0 ? sqrt(1.0 - xn * xn) : 0.5;

  // kerah
  vec2 pc = vec2(ax, b.y);
  float e0 = edgeD(pc, C0, C1);
  float collarD = min(min(e0, edgeD(pc, C1, C2)), min(edgeD(pc, C2, C3), edgeD(pc, C3, C0)));
  float inCollar = uCollar * smoothstep(-0.004, 0.004, collarD) * person;

  // kulit yang ikut tertutup kain: dada (kemeja dikancing) & lengan (lengan panjang)
  float topY = ax < C1.x ? -1.0 : C1.y + (ax - C1.x) * 0.45;
  float neck = step(ax, C1.x) * step(e0, 0.0);
  float hands = min(min(handDist(uHands[0]), handDist(uHands[1])), min(handDist(uHands[2]), handDist(uHands[3])));
  float notHand = smoothstep(0.0, 0.015, hands);
  float torsoZone = step(ax, 0.46);
  float skinCover = bodySkin * (1.0 - clothes) * (1.0 - neck) * step(topY, b.y) * notHand
                  * clamp(torsoZone * uCollar + (1.0 - torsoZone) * uSleeve, 0.0, 1.0);
  // manset di pergelangan
  float cuff = uSleeve * (1.0 - smoothstep(0.035, 0.045, hands)) * notHand
             * step(0.5, skinCover + (1.0 - torsoZone) * clothes);

  vec3 ga = garment(uMotifA, uOrnA, uDensityA, uTrimA, b, sx, ax, collarD, inCollar);
  vec3 gb = garment(uMotifB, uOrnB, uDensityB, uTrimB, b, sx, ax, collarD, inCollar);
  // transisi: pewarna menyebar dari dada ke seluruh kemeja, tepinya berkilau emas
  float n = vnoise(b * 7.0) * 0.18 + vnoise(b * 19.0) * 0.06;
  float dist = length(b - vec2(0.0, 0.45)) + n;
  float rad = uMix * 2.6;
  float k = 1.0 - smoothstep(rad - 0.05, rad, dist);
  float live = step(0.001, uMix) * (1.0 - step(0.999, uMix));
  float band = smoothstep(rad - 0.16, rad - 0.03, dist) * (1.0 - smoothstep(rad - 0.03, rad + 0.02, dist)) * live;
  float sparkle = step(0.965, hash(floor(b * 55.0) + floor(uMix * 18.0))) * band;
  vec3 g = mix(ga, gb, k);
  g = mix(g, mix(uTrimA, uTrimB, k) * 0.85, cuff * 0.9);
  g += vec3(1.0, 0.78, 0.32) * (band * 0.75 + sparkle * 1.6);

  // lipatan kain: hanya bayangan besar dari video (blur lebar), tanpa tekstur/warna baju asli
  vec3 W = vec3(0.299, 0.587, 0.114);
  float lum = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      lum += dot(texture(uVideo, vUv + vec2(float(i), float(j)) * uVideoTexel * 14.0).rgb, W);
    }
  }
  lum /= 9.0;
  float shade = clamp(lum / max(uRefLum, 0.06), 0.72, 1.12);
  float flatL = clamp(skinCover + inCollar * (1.0 - clothes), 0.0, 1.0);
  shade = mix(1.0, shade, uFold * (1.0 - flatL));

  // bayangan halus di tepi badan + lengkung tubuh
  float maskBlur = textureLod(uMask, vUv, 3.0).r;
  float ao = mix(0.84, 1.0, smoothstep(0.25, 0.85, max(maskBlur, flatL)));
  float curv = mix(0.86, 1.0, curve);

  vec3 col = g * shade * ao * curv;
  float alpha = max(max(clothes, skinCover), inCollar);
  vec3 res = mix(cam, col, alpha);

  // latar kota virtual: semua yang bukan orang diganti pemandangan kota + cahaya tepi hangat
  if (uBgOn > 0.5 && uHasMask > 0.5) {
    float pConf = max(textureLod(uMask, vUv, 0.0).a, alpha);
    float keep = smoothstep(0.35, 0.65, pConf);
    vec3 bg = texture(uBg, vec2(1.0 - vUv.x, vUv.y)).rgb;
    float rim = smoothstep(0.25, 0.5, pConf) * (1.0 - smoothstep(0.55, 0.9, textureLod(uMask, vUv, 2.0).a));
    res = mix(bg, res, keep) + vec3(1.0, 0.75, 0.45) * rim * 0.22;
  }

  if (uDev > 0.5) {
    res = mix(res, vec3(1.0, 0.25, 0.55), clothes * 0.28);
    res = mix(res, vec3(0.2, 0.8, 1.0), skinCover * 0.35);
    res = mix(res, vec3(1.0, 0.9, 0.2), (1.0 - notHand) * step(hands, 0.0) * 0.3);
  }

  // slider sebelum/sesudah: kiri layar = kamera asli
  if (uSplit > 0.0) {
    float sxs = 1.0 - vUv.x;
    if (sxs < uSplit) res = cam;
    float line = 1.0 - smoothstep(0.0015, 0.004, abs(sxs - uSplit));
    res = mix(res, vec3(1.0, 0.88, 0.6), line);
  }
  outColor = vec4(res, 1.0);
}`;

export interface BodyFrame {
  neck: [number, number];
  angle: number;
  scale: number;
}

export interface RenderParams {
  bodies: BodyFrame[];
  densityA: number;
  densityB: number;
  mix: number;
  refLum: number;
  dev: boolean;
  collar: boolean;
  ornament: boolean;
  collarY: number;
  fold: number;
  sleeve: boolean;
  /** maks. 4 tangan: [x, y, r] dalam uv / satuan tinggi; r = 0 jika tidak terlihat */
  hands: [number, number, number][];
  bg: boolean;
  /** posisi garis sebelum/sesudah di layar (0..1), 0 = mati */
  split: number;
}

export interface MotifTextures {
  tile: TexImageSource;
  ornament: TexImageSource;
  trim: [number, number, number];
}

const UNIFORMS = [
  'uVideo', 'uMask', 'uMotifA', 'uMotifB', 'uOrnA', 'uOrnB', 'uBg', 'uNeck', 'uAngle', 'uScale', 'uBodies', 'uBgOn', 'uSplit', 'uAspect', 'uDensityA', 'uDensityB',
  'uMix', 'uRefLum', 'uDev', 'uHasMask', 'uCollar', 'uOrnament', 'uTrimA', 'uTrimB', 'uVideoTexel',
  'uCollarY', 'uFold', 'uSleeve', 'uHands',
];

export class TryOnRenderer {
  readonly gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private texVideo: WebGLTexture;
  private texMask: WebGLTexture;
  private texBg: WebGLTexture;
  private slots: { A: { tile: WebGLTexture; orn: WebGLTexture; trim: [number, number, number] }; B: { tile: WebGLTexture; orn: WebGLTexture; trim: [number, number, number] } };
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private hasMask = false;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('Browser ini tidak mendukung WebGL2.');
    this.gl = gl;
    this.prog = this.link(VERT, FRAG);
    gl.useProgram(this.prog);
    for (const n of UNIFORMS) this.uni[n] = gl.getUniformLocation(this.prog, n);
    ['uVideo', 'uMask', 'uMotifA', 'uMotifB', 'uOrnA', 'uOrnB', 'uBg'].forEach((n, i) => gl.uniform1i(this.uni[n], i));

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.texVideo = this.makeTex(gl.CLAMP_TO_EDGE);
    this.texMask = this.makeTex(gl.CLAMP_TO_EDGE);
    this.texBg = this.makeTex(gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([246, 226, 196, 255]));
    const black: [number, number, number] = [0.2, 0.15, 0.1];
    this.slots = {
      A: { tile: this.makeTex(gl.REPEAT), orn: this.makeTex(gl.CLAMP_TO_EDGE), trim: black },
      B: { tile: this.makeTex(gl.REPEAT), orn: this.makeTex(gl.CLAMP_TO_EDGE), trim: black },
    };
    gl.bindTexture(gl.TEXTURE_2D, this.texMask);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }

  private compile(type: number, src: string) {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader error');
    return sh;
  }

  private link(vs: string, fs: string) {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error');
    return p;
  }

  private makeTex(wrap: number) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  private upload(tex: WebGLTexture, img: TexImageSource) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }

  resize(w: number, h: number) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  /** Pasang motif ke slot A (aktif) atau B (berikutnya, untuk transisi). */
  setMotif(slot: 'A' | 'B', m: MotifTextures) {
    const s = this.slots[slot];
    this.upload(s.tile, m.tile);
    this.upload(s.orn, m.ornament);
    s.trim = m.trim;
  }

  /** Gambar latar kota virtual. */
  setBackground(img: TexImageSource) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texBg);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }

  /** Setelah transisi selesai, motif B menjadi motif aktif. */
  swapMotifs() {
    const a = this.slots.A;
    this.slots.A = this.slots.B;
    this.slots.B = a;
  }

  /** data: RGBA per piksel (R pakaian, G kulit badan, B kulit wajah). */
  updateMask(data: Uint8Array, w: number, h: number) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texMask);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.hasMask = true;
  }

  render(video: TexImageSource, p: RenderParams) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texVideo);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    const bind = (unit: number, t: WebGLTexture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
    };
    bind(1, this.texMask);
    bind(2, this.slots.A.tile);
    bind(3, this.slots.B.tile);
    bind(4, this.slots.A.orn);
    bind(5, this.slots.B.orn);
    bind(6, this.texBg);

    const u = this.uni;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const b0 = p.bodies[0];
    const b1 = p.bodies[1] ?? b0;
    gl.uniform2fv(u.uNeck, [b0.neck[0], b0.neck[1], b1.neck[0], b1.neck[1]]);
    gl.uniform1fv(u.uAngle, [b0.angle, b1.angle]);
    gl.uniform1fv(u.uScale, [b0.scale, b1.scale]);
    gl.uniform1f(u.uBodies, p.bodies.length > 1 ? 2 : 1);
    gl.uniform1f(u.uBgOn, p.bg ? 1 : 0);
    gl.uniform1f(u.uSplit, p.split);
    gl.uniform1f(u.uAspect, w / Math.max(1, h));
    gl.uniform1f(u.uDensityA, p.densityA);
    gl.uniform1f(u.uDensityB, p.densityB);
    gl.uniform1f(u.uMix, p.mix);
    gl.uniform1f(u.uRefLum, p.refLum);
    gl.uniform1f(u.uDev, p.dev ? 1 : 0);
    gl.uniform1f(u.uHasMask, this.hasMask ? 1 : 0);
    gl.uniform1f(u.uCollar, p.collar ? 1 : 0);
    gl.uniform1f(u.uOrnament, p.ornament ? 1 : 0);
    gl.uniform3fv(u.uTrimA, this.slots.A.trim);
    gl.uniform3fv(u.uTrimB, this.slots.B.trim);
    gl.uniform2f(u.uVideoTexel, 1 / Math.max(1, w), 1 / Math.max(1, h));
    gl.uniform1f(u.uCollarY, p.collarY);
    gl.uniform1f(u.uFold, p.fold);
    gl.uniform1f(u.uSleeve, p.sleeve ? 1 : 0);
    const hands = new Float32Array(12);
    p.hands.slice(0, 4).forEach((h, i) => hands.set(h, i * 3));
    gl.uniform3fv(u.uHands, hands);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    [this.texVideo, this.texMask, this.texBg, this.slots.A.tile, this.slots.A.orn, this.slots.B.tile, this.slots.B.orn].forEach((t) => gl.deleteTexture(t));
    gl.deleteProgram(this.prog);
    gl.deleteVertexArray(this.vao);
  }
}
