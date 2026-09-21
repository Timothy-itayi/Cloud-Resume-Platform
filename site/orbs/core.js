/**
 * Vanilla WebGL host for Orbkit orbs.
 * Runtime adapted from Orbkit (MIT) — https://github.com/zzzzshawn/orbkit
 * No React. This site is static HTML on Azure Static Web Apps.
 */
"use strict";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const ORB_GLSL_HELPERS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;   // slow ambient clock (half real-time)
uniform float uAnim;   // flow clock — its speed follows the output volume
uniform float uInput;  // input volume 0..1: user speech energy
uniform float uOutput; // output volume 0..1: agent speech energy

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return v;
}
vec2 orbUV() { return (2.0 * gl_FragCoord.xy - uRes) / min(uRes.x, uRes.y); }

// GLSL ES 1.0 has no tanh() — it arrived in ES 3.0. Shader-golf listings lean
// on it as a tone-mapper, so it ships here. Clamped against exp() overflow;
// accurate for the non-negative accumulators those shaders produce.
vec3 tanh3(vec3 x) {
  x = clamp(x, -10.0, 10.0);
  vec3 e = exp(2.0 * x);
  return (e - 1.0) / (e + 1.0);
}

`;

function hexToRgb(hex) {
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function paramUniformDecls(variant) {
  return [
    ...variant.params.map((p) => "uniform float uP_" + p.key + ";"),
    ...variant.colors.map((c) => "uniform vec3 uC_" + c.key + ";"),
  ].join("\n");
}

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[orbkit] shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function resolveParam(def, variant, options) {
  const live = options.params && options.params[def.key];
  if (typeof live === "number") return live;
  const state = options.state || "idle";
  const override = options.statePresets && options.statePresets[state];
  if (override && typeof override[def.key] === "number") return override[def.key];
  const preset = variant.statePresets && variant.statePresets[state];
  if (preset && typeof preset[def.key] === "number") return preset[def.key];
  return def.default;
}

function resolveColor(def, variant, options) {
  const live = options.colors && options.colors[def.key];
  if (live) return live;
  const state = options.state || "idle";
  const override = options.stateColors && options.stateColors[state];
  if (override && override[def.key]) return override[def.key];
  const preset = variant.stateColors && variant.stateColors[state];
  if (preset && preset[def.key]) return preset[def.key];
  return def.default;
}

/**
 * Mount a shader orb onto an existing canvas.
 * Returns a teardown function.
 */
export function mountOrb(canvas, variant, options) {
  options = options || {};
  const maxDpr = options.maxDpr == null ? 1.25 : options.maxDpr;
  const volumes = options.volumes || { input: 0, output: 0.18 };
  const pauseOffscreen = options.pauseOffscreen !== false;
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  if (!gl) return function () {};

  const loseExt = gl.getExtension("WEBGL_lose_context");
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(
    gl,
    gl.FRAGMENT_SHADER,
    ORB_GLSL_HELPERS + paramUniformDecls(variant) + variant.frag
  );
  if (!vs || !fs) return function () {};

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[orbkit] program link error:", gl.getProgramInfoLog(prog));
    return function () {};
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uAnim = gl.getUniformLocation(prog, "uAnim");
  const uInput = gl.getUniformLocation(prog, "uInput");
  const uOutput = gl.getUniformLocation(prog, "uOutput");

  const paramLocs = variant.params.map((p) => ({
    def: p,
    loc: gl.getUniformLocation(prog, "uP_" + p.key),
  }));
  const colorLocs = variant.colors.map((c) => ({
    def: c,
    loc: gl.getUniformLocation(prog, "uC_" + c.key),
  }));

  let resScale = 1;
  const resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * resScale;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  };
  resize();

  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  if (resizeObserver) resizeObserver.observe(canvas);

  let visible = !pauseOffscreen;
  const intersectionObserver =
    pauseOffscreen && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          function (entries) {
            visible = Boolean(entries[0] && entries[0].isIntersecting);
            if (visible) last = performance.now() / 1000;
          },
          { rootMargin: "180px 0px", threshold: 0 }
        )
      : null;
  if (intersectionObserver) intersectionObserver.observe(canvas);
  else visible = true;

  let tSec = 0;
  let anim = Math.random() * 40;
  const paramClocks = {};
  paramLocs.forEach(function (item) {
    if (item.def.integrate) paramClocks[item.def.key] = Math.random() * 80;
  });
  let last = performance.now() / 1000;
  let raf = 0;
  let frameEma = 1 / 60;
  let stopped = false;

  const draw = function (dt) {
    const vin = volumes.input == null ? 0 : volumes.input;
    const vout = volumes.output == null ? 0.18 : volumes.output;
    const speedMul = 0.1 + (1 - Math.pow(vout - 1, 2)) * 0.9;
    anim += dt * speedMul;

    gl.uniform1f(uTime, tSec * 0.5);
    gl.uniform1f(uAnim, anim);
    gl.uniform1f(uInput, vin);
    gl.uniform1f(uOutput, vout);

    paramLocs.forEach(function (item) {
      const value = resolveParam(item.def, variant, options);
      if (item.def.integrate) {
        paramClocks[item.def.key] += dt * speedMul * value;
        gl.uniform1f(item.loc, paramClocks[item.def.key]);
      } else {
        gl.uniform1f(item.loc, value);
      }
    });

    colorLocs.forEach(function (item) {
      const rgb = hexToRgb(resolveColor(item.def, variant, options));
      gl.uniform3f(item.loc, rgb[0], rgb[1], rgb[2]);
    });

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (typeof options.onDraw === "function") options.onDraw();
  };

  draw(1);

  const onHidden = function () {
    if (document.hidden) last = performance.now() / 1000;
  };
  document.addEventListener("visibilitychange", onHidden);

  const loop = function () {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden || !visible || options.paused) return;
    const now = performance.now() / 1000;
    const dt = Math.min(now - last, 0.05);
    last = now;
    tSec += dt;
    if (dt < 0.05) frameEma += (dt - frameEma) * 0.08;
    if (tSec > 1.5 && frameEma > 1 / 34 && resScale > 0.5) {
      resScale = Math.max(0.5, resScale * 0.8);
      frameEma = 1 / 60;
      resize();
    } else if (tSec > 1.5 && frameEma < 1 / 55 && resScale < 1) {
      resScale = Math.min(1, resScale / 0.8);
      frameEma = 1 / 60;
      resize();
    }
    draw(dt);
  };

  if (!reduceMotion) loop();
  canvas.style.opacity = "1";

  return function teardown() {
    stopped = true;
    cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", onHidden);
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteBuffer(buf);
    try {
      if (loseExt) loseExt.loseContext();
    } catch (e) {
      /* already gone */
    }
  };
}
