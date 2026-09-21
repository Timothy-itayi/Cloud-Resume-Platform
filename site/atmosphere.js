/**
 * Hero sky: SHDR-31 volumetric corona, sitting behind the intro copy.
 * Intentionally not a talking-orb widget. Projects stay the product.
 */
import { mountOrb } from "./orbs/core.js";
import { shdr31Orb } from "./orbs/shdr-31.js";

const MASK_MAX_W = 360;
const LUMA_ON = 0.52;
const LUMA_OFF = 0.4;

function wrapInk(element, className, nodeType) {
  if (element.querySelector("." + className + "-ink")) {
    return element.querySelector("." + className + "-ink--dark");
  }

  const light = document.createElement(nodeType || "div");
  light.className = className + "-ink " + className + "-ink--light";
  while (element.firstChild) light.appendChild(element.firstChild);

  const dark = document.createElement(nodeType || "div");
  dark.className = className + "-ink " + className + "-ink--dark";
  dark.setAttribute("aria-hidden", "true");
  dark.inert = true;
  dark.innerHTML = light.innerHTML;
  dark.querySelectorAll("[id]").forEach(function (el) {
    el.removeAttribute("id");
  });
  dark.querySelectorAll("a").forEach(function (el) {
    el.removeAttribute("href");
    el.setAttribute("tabindex", "-1");
  });

  element.appendChild(light);
  element.appendChild(dark);
  return dark;
}

function attachContrast(canvas) {
  const heading = document.querySelector("#intro-heading");
  const aside = document.querySelector(".intro-aside");

  const targets = [];
  if (heading) {
    const dark = wrapInk(heading, "intro-heading", "span");
    targets.push({ el: heading, dark: dark, state: new Uint8Array(0), lastUrl: "" });
  }
  if (aside) {
    const dark = wrapInk(aside, "intro-aside", "div");
    targets.push({ el: aside, dark: dark, state: new Uint8Array(0), lastUrl: "" });
  }

  if (!targets.length) return function () {};

  const mask = document.createElement("canvas");
  const ctx = mask.getContext("2d", { willReadFrequently: true });
  if (!ctx) return function () {};

  function resizeMask() {
    targets.forEach(function (t) {
      const cssW = Math.max(1, t.el.clientWidth);
      const cssH = Math.max(1, t.el.clientHeight);
      const scale = Math.min(1, MASK_MAX_W / cssW);
      t.nextW = Math.max(1, Math.round(cssW * scale));
      t.nextH = Math.max(1, Math.round(cssH * scale));
      if (t.state.length !== t.nextW * t.nextH) {
        t.state = new Uint8Array(t.nextW * t.nextH);
      }
    });
  }

  resizeMask();
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(resizeMask);
    targets.forEach(function (t) { ro.observe(t.el); });
  }

  return function syncContrast() {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (!canvasWidth || !canvasHeight || cssW < 2 || cssH < 2) return;

    const canvasRect = canvas.getBoundingClientRect();

    targets.forEach(function (t) {
      const maskW = t.nextW;
      const maskH = t.nextH;
      if (!maskW || !maskH) return;

      const rect = t.el.getBoundingClientRect();
      const left = Math.max(rect.left, canvasRect.left);
      const top = Math.max(rect.top, canvasRect.top);
      const right = Math.min(rect.right, canvasRect.right);
      const bottom = Math.min(rect.bottom, canvasRect.bottom);

      if (right - left < 2 || bottom - top < 2) {
        if (t.lastUrl) {
          t.lastUrl = "";
          t.dark.style.removeProperty("--ink-mask");
        }
        return;
      }

      const scaleX = canvasWidth / canvasRect.width;
      const scaleY = canvasHeight / canvasRect.height;
      let sx = (left - canvasRect.left) * scaleX;
      let sy = (top - canvasRect.top) * scaleY;
      let sw = (right - left) * scaleX;
      let sh = (bottom - top) * scaleY;

      if (sx < 0) {
        sw += sx;
        sx = 0;
      }
      if (sy < 0) {
        sh += sy;
        sy = 0;
      }
      sw = Math.min(sw, canvasWidth - sx);
      sh = Math.min(sh, canvasHeight - sy);
      if (sw < 1 || sh < 1) return;

      const destX = ((left - rect.left) / rect.width) * maskW;
      const destY = ((top - rect.top) / rect.height) * maskH;
      const destW = ((right - left) / rect.width) * maskW;
      const destH = ((bottom - top) / rect.height) * maskH;

      if (mask.width !== maskW || mask.height !== maskH) {
        mask.width = maskW;
        mask.height = maskH;
      } else {
        ctx.clearRect(0, 0, maskW, maskH);
      }

      ctx.drawImage(canvas, sx, sy, sw, sh, destX, destY, destW, destH);

      const pixels = ctx.getImageData(0, 0, maskW, maskH);
      const data = pixels.data;
      let changed = false;
      const state = t.state;

      for (let p = 0, i = 0; p < state.length; p += 1, i += 4) {
        const lum =
          (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        const prev = state[p];
        const next = prev ? (lum > LUMA_OFF ? 1 : 0) : lum > LUMA_ON ? 1 : 0;
        if (next !== prev) {
          state[p] = next;
          changed = true;
        }
        const m = next ? 255 : 0;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = m;
      }

      if (!changed && t.lastUrl) return;

      ctx.putImageData(pixels, 0, 0);
      const url = mask.toDataURL("image/png");
      if (url === t.lastUrl) return;
      t.lastUrl = url;
      t.dark.style.setProperty("--ink-mask", 'url("' + url + '")');
    });
  };
}

function boot() {
  const sky = document.getElementById("orb-sky");
  if (!sky) return;

  const compact =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 40rem)").matches;

  const syncContrast = attachContrast(sky);

  const stop = mountOrb(sky, shdr31Orb, {
    state: "idle",
    maxDpr: compact ? 0.65 : 0.75,
    volumes: { input: 0, output: compact ? 0.06 : 0.08 },
    params: {
      speed: 0.16,
      sweepRate: 0.045,
      radius: compact ? 3.05 : 3.35,
      camDist: compact ? 6.8 : 6.2,
      fov: compact ? 3.4 : 3.1,
      rayGain: 0.92,
      rayFalloff: 7.5,
      alphaGain: 5.4,
      edgeFade: 0.58,
      surfaceLit: 0.07,
      warp: 1.55,
      warpFreq: 2.6,
      ambient: 0,
    },
    onDraw: syncContrast,
  });

  window.addEventListener(
    "pagehide",
    function () {
      stop();
    },
    { once: true }
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
