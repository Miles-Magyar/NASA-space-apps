import './styles.css';
import starfieldUrl from './assets/starfield.jpg';
import starUrl from './assets/star.jpg';
import flameUrl from './assets/favicon.png';
import { TOPICS, topicById, topicIdFromHash } from './topics';
import { OVERVIEW_SECTIONS, SOFIE_FEATURE } from './topics/general/overview';
import { initReadingScroll, type ReadingScrollHandles } from './topics/general/reading-scroll';
import { getMission } from './topics/mission-data';
import { renderMissionView, type MissionViewState } from './topics/mission-view';
import { renderInvestigationsCatalog } from './topics/investigations/catalog';
import { renderCadCheckerDemo, type CadDemoState } from './topics/cad-checker/demo';
import { mountHelpbot } from './helpbot';
import { searchCorpus } from './search';

document.documentElement.style.setProperty('--starfield-image', `url(${starfieldUrl})`);

const app = document.querySelector<HTMLElement>('#app')!;

let reading: ReadingScrollHandles | null = null;
let missionView: MissionViewState | null = null;
let cadDemo: CadDemoState | null = null;
let helpbotHandle: { destroy: () => void } | null = null;
let menuButton: HTMLButtonElement | null = null;

function currentTopicId(): string {
  return topicIdFromHash(location.hash || '#general');
}

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <header class="app-chrome">
        <button type="button" class="menu-btn" aria-label="Study Topics" aria-expanded="false" aria-controls="topic-sidebar">
          <span class="menu-icon" aria-hidden="true"></span>
          <span class="menu-label">Study Topics</span>
        </button>
        <div class="search-wrap">
          <label class="sr-only" for="masthead-search">Search evidence</label>
          <input id="masthead-search" type="search" placeholder="Search Saffire, Nomex, EMU…" autocomplete="off" />
          <div class="search-results" hidden role="listbox"></div>
        </div>
      </header>

      <aside id="topic-sidebar" class="sidebar" hidden>
        <div class="sidebar-inner">
          <nav>
            <p class="sidebar-group-label">Start</p>
            <ul class="topic-list">
              ${TOPICS.filter((t) => t.kind === 'general' || t.kind === 'catalog' || t.kind === 'synthesis')
                .map((t) => `<li><a href="#${t.id}" data-topic="${t.id}">${t.title}</a></li>`)
                .join('')}
            </ul>
            <p class="sidebar-group-label">Tools</p>
            <ul class="topic-list">
              ${TOPICS.filter((t) => t.kind === 'tool')
                .map((t) => `<li><a href="#${t.id}" data-topic="${t.id}">${t.title}</a></li>`)
                .join('')}
            </ul>
            <p class="sidebar-group-label">Study topics</p>
            <ul class="topic-list">
              ${TOPICS.filter((t) => t.kind === 'mission')
                .map((t) => `<li><a href="#${t.id}" data-topic="${t.id}">${t.title}</a></li>`)
                .join('')}
            </ul>
          </nav>
        </div>
      </aside>

      <main id="main" class="main-panel" tabindex="-1"></main>
      <div class="helpbot"></div>
    </div>
  `;

  menuButton = app.querySelector('.menu-btn');
  const sidebar = app.querySelector<HTMLElement>('.sidebar')!;
  const searchInput = app.querySelector<HTMLInputElement>('#masthead-search')!;
  const searchResults = app.querySelector<HTMLElement>('.search-results')!;

  const closeSidebar = (restoreFocus = false) => {
    sidebar.hidden = true;
    app.querySelector('.app-shell')?.classList.remove('sidebar-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuButton?.focus({ preventScroll: true });
  };

  const openSidebar = () => {
    sidebar.hidden = false;
    app.querySelector('.app-shell')?.classList.add('sidebar-open');
    menuButton?.setAttribute('aria-expanded', 'true');
  };

  menuButton?.addEventListener('click', () => {
    if (sidebar.hidden) openSidebar();
    else closeSidebar();
  });

  sidebar.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a[data-topic]');
    if (a) closeSidebar(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && !sidebar.hidden) {
      e.preventDefault();
      closeSidebar(true);
    }
  });

  const runSearch = () => {
    const q = searchInput.value.trim();
    if (!q) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
      return;
    }
    const hits = searchCorpus(q);
    searchResults.hidden = false;
    if (!hits.length) {
      searchResults.innerHTML = `<p class="search-empty">No matches in the curated corpus.</p>`;
      return;
    }
    searchResults.innerHTML = hits
      .map(
        (h) =>
          `<a class="search-hit" role="option" href="${h.href}"><span class="search-kind">${h.kind}</span><strong>${h.title}</strong><span>${h.snippet}</span></a>`,
      )
      .join('');
  };

  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('focus', runSearch);
  searchResults.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) {
      searchResults.hidden = true;
    }
  });
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!sidebar.hidden && !sidebar.contains(target) && !menuButton?.contains(target)) {
      closeSidebar(sidebar.contains(document.activeElement));
    }
    if (!target.closest('.search-wrap')) {
      searchResults.hidden = true;
    }
  });

  helpbotHandle?.destroy();
  helpbotHandle = mountHelpbot(app.querySelector('.helpbot')!);
}

function renderGeneral(main: HTMLElement) {
  main.innerHTML = `
    <div class="general-root">
      <section class="general-intro">
        <p class="challenge-label">NASA Space Apps Challenge · Flame in Freefall</p>
        <h1 class="hero-title">Flame in Freefall</h1>
        <img class="match-flame" src="${flameUrl}" width="64" height="64" alt="" />
        <p class="hero-sub">SI-powered fire safety insights from microgravity combustion data</p>
        <p class="scroll-hint" aria-hidden="true">Scroll</p>
      </section>
      <div class="sun-panel" aria-hidden="true">
        <img src="${starUrl}" alt="" />
      </div>
      <nav class="scroll-rail" aria-label="Reading stops">
        <button type="button" aria-label="Title"></button>
        ${OVERVIEW_SECTIONS.map((s) => `<button type="button" aria-label="${s.heading}"></button>`).join('')}
        <button type="button" aria-label="${SOFIE_FEATURE.title}"></button>
      </nav>
      ${OVERVIEW_SECTIONS.map(
        (s) => `<section class="reading-section" id="${s.id}">
          <div class="reading-inner">
            <h2>${s.heading}</h2>
            <div class="reading-body">${s.html ?? s.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>
          </div>
        </section>`,
      ).join('')}
      <section class="reading-section feature-section" id="sofie-feature">
        <div class="reading-inner">
          <article class="feature-card">
            <h2>${SOFIE_FEATURE.title}</h2>
            <p>${SOFIE_FEATURE.body}</p>
            <p class="sources-cell">${SOFIE_FEATURE.links
              .map((l) =>
                l.url.startsWith('#')
                  ? `<a href="${l.url}">${l.label}</a>`
                  : `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`,
              )
              .join(' · ')}</p>
          </article>
        </div>
      </section>
    </div>
  `;

  reading?.destroy();
  reading = initReadingScroll(main.querySelector('.general-root')!);

  main.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = (a as HTMLAnchorElement).getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        // allow hash routing
        e.preventDefault();
        location.hash = href;
      }
    });
  });
}

function renderTopic(topicId: string) {
  reading?.destroy();
  reading = null;
  missionView?.destroy();
  missionView = null;
  cadDemo?.destroy();
  cadDemo = null;

  const main = app.querySelector<HTMLElement>('#main')!;
  const shell = app.querySelector('.app-shell')!;
  const chrome = app.querySelector('.app-chrome');

  app.querySelectorAll('.topic-list a').forEach((a) => {
    a.classList.toggle('is-active', a.getAttribute('data-topic') === topicId);
  });

  if (topicId === 'general') {
    shell.classList.remove('starfield');
    chrome?.classList.remove('is-visible');
    renderGeneral(main);
    return;
  }

  shell.classList.add('starfield');
  chrome?.classList.add('is-visible');
  const topic = topicById(topicId);
  if (!topic) {
    main.innerHTML = `<p class="lede">Topic not found.</p>`;
    return;
  }

  if (topic.kind === 'catalog') {
    main.innerHTML = `<div class="mission-root"></div>`;
    renderInvestigationsCatalog(main.querySelector('.mission-root')!);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  if (topic.kind === 'tool' && topicId === 'cad-checker') {
    main.innerHTML = `<div class="mission-root"></div>`;
    cadDemo = renderCadCheckerDemo(main.querySelector('.mission-root')!);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  const mission = getMission(topicId);
  if (!mission) {
    main.innerHTML = `<p class="lede">Topic not found.</p>`;
    return;
  }
  main.innerHTML = `<div class="mission-root"></div>`;
  missionView = renderMissionView(main.querySelector('.mission-root')!, mission);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function boot() {
  renderShell();
  renderTopic(currentTopicId());
  window.addEventListener('hashchange', () => renderTopic(currentTopicId()));
}

boot();
