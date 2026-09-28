import { animate } from "animejs/animation";

/**
 * Line-art photo trace: a Sobel edge drawing of the real photo sweeps in
 * first — as if being drawn — then the photograph develops through it.
 * Real content over decoration: the line art IS the photo's own edges.
 *
 * Never load-bearing: any failure (CORS, decode, zero size) simply shows
 * the photo.
 */
export function initTrace(host: HTMLElement): () => void {
  const img = host.querySelector<HTMLImageElement>("img");
  const canvas = host.querySelector<HTMLCanvasElement>("canvas");
  if (!img || !canvas) return () => {};

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    img.style.opacity = "1";
    return () => {};
  }

  img.style.opacity = "0";
  let disposed = false;
  let io: IntersectionObserver | null = null;

  const fail = () => {
    img.style.opacity = "1";
    canvas.style.display = "none";
  };

  const build = () => {
    try {
      const W = 640;
      const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      // Brave and Safari farble canvas readbacks for fingerprinting
      // protection, which makes getImageData both slower and slightly
      // randomized. The effect is decorative and already guarded, so a
      // failure or an odd result simply falls back to the plain photo.
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return fail();
      octx.drawImage(img, 0, 0, W, H);
      const src = octx.getImageData(0, 0, W, H).data;

      // grayscale
      const g = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) {
        g[i] = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
      }
      // 3x3 sobel
      const mag = new Float32Array(W * H);
      let max = 1;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          const gx = -g[i - W - 1] - 2 * g[i - 1] - g[i + W - 1] + g[i - W + 1] + 2 * g[i + 1] + g[i + W + 1];
          const gy = -g[i - W - 1] - 2 * g[i - W] - g[i - W + 1] + g[i + W - 1] + 2 * g[i + W] + g[i + W + 1];
          const m = Math.hypot(gx, gy);
          mag[i] = m;
          if (m > max) max = m;
        }
      }

      // paint edges tinted along the brand gradient by x position
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fail();
      const out = ctx.createImageData(W, H);
      const stops = [[206, 42, 127], [105, 79, 212], [14, 171, 205]];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const e = Math.pow(mag[i] / max, 0.6);
          if (e < 0.14) continue;
          const t = (x / W) * 2;
          const s0 = stops[Math.min(1, Math.floor(t))];
          const s1 = stops[Math.min(2, Math.floor(t) + 1)];
          const f = t - Math.floor(t);
          const lift = 0.55 + 0.45 * e;
          out.data[i * 4] = (s0[0] + (s1[0] - s0[0]) * f) * lift + 90 * e;
          out.data[i * 4 + 1] = (s0[1] + (s1[1] - s0[1]) * f) * lift + 90 * e;
          out.data[i * 4 + 2] = (s0[2] + (s1[2] - s0[2]) * f) * lift + 90 * e;
          out.data[i * 4 + 3] = Math.min(255, e * 340);
        }
      }
      ctx.putImageData(out, 0, 0);

      // reveal: a diagonal drawing sweep, then the photo develops through
      io = new IntersectionObserver((entries) => {
        if (!entries[0]?.isIntersecting || disposed) return;
        io?.disconnect();
        const m = { p: -30 };
        animate(m, {
          p: 130,
          duration: 1900,
          ease: "inOut(1.6)",
          onUpdate: () => {
            const grad = `linear-gradient(115deg, #000 ${m.p - 24}%, transparent ${m.p}%)`;
            canvas.style.webkitMaskImage = grad;
            canvas.style.maskImage = grad;
          },
          onComplete: () => {
            if (disposed) return;
            animate(img, { opacity: [0, 1], duration: 1100, ease: "inOut(2)", delay: 250 });
            animate(canvas, { opacity: [1, 0.22], duration: 1400, ease: "linear", delay: 350 });
          },
        });
      }, { threshold: 0.35 });
      io.observe(host);
    } catch {
      fail();
    }
  };

  if (img.complete && img.naturalWidth) build();
  else {
    img.addEventListener("load", build, { once: true });
    img.addEventListener("error", fail, { once: true });
  }

  return () => {
    disposed = true;
    io?.disconnect();
  };
}
