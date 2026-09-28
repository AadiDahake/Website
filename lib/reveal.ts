import { animate } from "animejs/animation";
import { stagger, remove, round } from "animejs/utils";

/**
 * Site-wide reveal + counter system, driven entirely by markup contracts:
 *   data-reveal        fade and rise in when scrolled into view
 *   data-reveal-group  stagger the element's direct children instead
 *   data-count="1234"  count up to the number, with data-prefix / data-suffix
 *
 * anime.js is imported statically ON PURPOSE: it ships bundled in the same
 * chunk as this module, so by the time anything is hidden the animator is
 * already in memory. (An inner dynamic import once left elements hidden for
 * the length of a network round-trip — the page loaded visibly broken.)
 *
 * Hide-then-observe happens in the SAME tick, so no-JS users always get
 * visible content and nothing is ever left CSS-hidden forever.
 */
export function initReveal(root: ParentNode = document): () => void {
  const reduced = typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealEls = Array.from(
    root.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-group]"),
  );
  const countEls = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));

  if (!revealEls.length && !countEls.length) return () => {};

  // Reduced motion is a designed state: show the finished pose immediately.
  if (reduced) {
    for (const el of countEls) paintCount(el, Number(el.dataset.count || 0));
    return () => {};
  }

  const targets = new Map<HTMLElement, HTMLElement[]>();
  for (const el of revealEls) {
    const group = el.hasAttribute("data-reveal-group")
      ? (Array.from(el.children) as HTMLElement[])
      : [el];
    targets.set(el, group);
    for (const t of group) {
      t.style.opacity = "0";
      t.style.transform = "translateY(22px)";
    }
  }

  const animated: HTMLElement[] = [];
  const observers: IntersectionObserver[] = [];

  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      revealIO.unobserve(el);
      const group = targets.get(el);
      if (!group) continue;
      animated.push(...group);
      animate(group, {
        opacity: [0, 1],
        translateY: [22, 0],
        duration: 750,
        delay: group.length > 1 ? stagger(90) : 0,
        ease: "out(3)",
      });
    }
  }, { threshold: 0.12 });
  observers.push(revealIO);
  for (const el of revealEls) revealIO.observe(el);

  const countIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      countIO.unobserve(el);
      const to = Number(el.dataset.count || 0);
      const o = { v: 0 };
      animate(o, {
        v: to,
        duration: 1500,
        ease: "out(4)",
        modifier: round(0),
        onUpdate: () => paintCount(el, o.v),
      });
    }
  }, { threshold: 0.3 });
  observers.push(countIO);
  for (const el of countEls) countIO.observe(el);

  return () => {
    for (const io of observers) io.disconnect();
    if (animated.length) remove(animated);
  };
}

function paintCount(el: HTMLElement, v: number) {
  el.textContent = `${el.dataset.prefix || ""}${v}${el.dataset.suffix || ""}`;
}
