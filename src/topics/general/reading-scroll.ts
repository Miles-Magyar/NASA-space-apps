const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface ReadingScrollHandles {
  destroy: () => void;
  jumpTo: (index: number) => void;
}

export function initReadingScroll(root: HTMLElement, closeSidebar: () => void): ReadingScrollHandles {
  const intro = root.querySelector<HTMLElement>('.general-intro');
  const sections = Array.from(root.querySelectorAll<HTMLElement>('.reading-section'));
  const rail = root.querySelector<HTMLElement>('.scroll-rail');
  const sun = root.querySelector<HTMLElement>('.sun-panel');
  const chrome = document.querySelector<HTMLElement>('.app-chrome');
  const stops = [intro, ...sections].filter(Boolean) as HTMLElement[];

  let active = 0;
  let settling = false;
  let destroyFns: Array<() => void> = [];

  function setActive(i: number) {
    active = Math.max(0, Math.min(stops.length - 1, i));
    rail?.querySelectorAll('button').forEach((btn, idx) => {
      btn.classList.toggle('is-active', idx === active);
      btn.setAttribute('aria-current', idx === active ? 'true' : 'false');
    });
    const pastIntro = active > 0 || (intro ? intro.getBoundingClientRect().top < -40 : true);
    if (active === 0 && chrome?.classList.contains('is-visible')) closeSidebar();
    chrome?.classList.toggle('is-visible', active > 0);
    sun?.classList.toggle('is-visible', active > 0);
    root.classList.toggle('past-intro', pastIntro);
  }

  function jumpTo(index: number) {
    const el = stops[index];
    if (!el) return;
    settling = true;
    setActive(index);
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => {
      settling = false;
    }, prefersReducedMotion() ? 50 : 450);
  }

  function onScroll() {
    if (!intro) return;
    const rect = intro.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
    intro.style.setProperty('--intro-progress', String(progress));
    if (settling) return;
    let best = 0;
    let bestDist = Infinity;
    stops.forEach((el, i) => {
      const d = Math.abs(el.getBoundingClientRect().top);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  }

  function onWheel(e: WheelEvent) {
    if (prefersReducedMotion() || settling) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('.helpbot, .sidebar, .search-results, .cad-checker')) return;
    const current = stops[active];
    if (!current) return;
    // Allow inner scroll when section content exceeds viewport
    if (current.scrollHeight > current.clientHeight + 8) {
      const atTop = current.scrollTop <= 0;
      const atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 2;
      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
    }
    if (Math.abs(e.deltaY) < 20) return;
    e.preventDefault();
    jumpTo(active + (e.deltaY > 0 ? 1 : -1));
  }

  rail?.querySelectorAll('button').forEach((btn, idx) => {
    const handler = () => jumpTo(idx);
    btn.addEventListener('click', handler);
    destroyFns.push(() => btn.removeEventListener('click', handler));
  });

  const scrollHandler = () => onScroll();
  window.addEventListener('scroll', scrollHandler, { passive: true });
  destroyFns.push(() => window.removeEventListener('scroll', scrollHandler));

  if (!prefersReducedMotion()) {
    const wheelHandler = (e: WheelEvent) => onWheel(e);
    window.addEventListener('wheel', wheelHandler, { passive: false });
    destroyFns.push(() => window.removeEventListener('wheel', wheelHandler));
  }

  onScroll();

  return {
    destroy: () => destroyFns.forEach((fn) => fn()),
    jumpTo,
  };
}
