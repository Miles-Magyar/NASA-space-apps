import { requestHelpbot } from './si-client';
import { HELPBOT_HISTORY_LIMIT, HELPBOT_MESSAGE_LIMIT, type HelpbotSource, type HelpbotTurn } from './helpbot-contract';
import { TOPICS } from './topics';

const WELCOME_MESSAGE =
  'Welcome to Flame in Freefall. Ask where to find fire-safety information — for example “Saffire flame spread”, “Nomex oxygen limit”, or “EMU atmosphere”. Answers cite the curated NASA corpus.';
const WELCOME_PREVIEW_MS = 5000;

export interface HelpbotHandle {
  showWelcomePreview: () => void;
  hideWelcomePreview: () => void;
  returnToTitle: () => void;
  destroy: () => void;
}

interface ChatMessage extends HelpbotTurn {
  localHtml?: boolean;
  sources?: HelpbotSource[];
  notice?: string;
}

function appendAssistantText(bubble: HTMLElement, text: string): void {
  const markup = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(#([a-z-]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(markup)) {
    const [token, bold, label, topic] = match;
    bubble.append(text.slice(cursor, match.index));
    if (bold) {
      const strong = document.createElement('strong');
      strong.textContent = bold;
      bubble.append(strong);
    } else if (TOPICS.some(({ id }) => id === topic)) {
      const link = document.createElement('a');
      link.href = `#${topic}`;
      link.textContent = label;
      bubble.append(link);
    } else {
      bubble.append(token);
    }
    cursor = match.index + token.length;
  }
  bubble.append(text.slice(cursor));
}

export function mountHelpbot(root: HTMLElement): HelpbotHandle {
  const messages: ChatMessage[] = [];
  root.innerHTML = `
    <button type="button" class="helpbot-launcher" aria-label="Open helpbot" aria-expanded="false" aria-controls="helpbot-panel">
      <span class="helpbot-icon" aria-hidden="true"></span>
    </button>
    <div class="helpbot-welcome-preview" hidden>
      <span role="status"></span>
      <button type="button" class="helpbot-welcome-dismiss" aria-label="Dismiss Helpbot tip">×</button>
    </div>
    <section id="helpbot-panel" class="helpbot-panel" aria-label="Helpbot" hidden>
      <div class="helpbot-log" role="log" aria-label="Conversation" tabindex="0"></div>
      <form class="helpbot-form">
        <label class="sr-only" for="helpbot-input">Message</label>
        <input id="helpbot-input" type="text" autocomplete="off" maxlength="${HELPBOT_MESSAGE_LIMIT}" placeholder="Ask where to find fire-safety evidence…" />
        <button type="submit">Send</button>
      </form>
    </section>
  `;

  const launcher = root.querySelector<HTMLButtonElement>('.helpbot-launcher')!;
  const panel = root.querySelector<HTMLElement>('.helpbot-panel')!;
  const welcomePreview = root.querySelector<HTMLElement>('.helpbot-welcome-preview')!;
  const welcomeText = welcomePreview.querySelector<HTMLElement>('[role="status"]')!;
  const dismissWelcome = welcomePreview.querySelector<HTMLButtonElement>('button')!;
  const log = root.querySelector<HTMLElement>('.helpbot-log')!;
  const form = root.querySelector<HTMLFormElement>('.helpbot-form')!;
  const input = root.querySelector<HTMLInputElement>('#helpbot-input')!;
  const send = form.querySelector<HTMLButtonElement>('button')!;
  let activeRequest: AbortController | null = null;
  let previewTimer: number | undefined;
  let welcomeShown = false;

  function hideWelcomePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = undefined;
    welcomePreview.hidden = true;
    welcomeText.textContent = '';
  }

  function dismissWelcomePreview() {
    if (document.activeElement === dismissWelcome) launcher.focus();
    hideWelcomePreview();
  }

  function showWelcomePreview() {
    if (welcomeShown || !panel.hidden) return;
    welcomeShown = true;
    welcomePreview.hidden = false;
    welcomeText.textContent = 'Ask about fire safety';
    previewTimer = window.setTimeout(dismissWelcomePreview, WELCOME_PREVIEW_MS);
  }

  function renderLog() {
    log.replaceChildren(...messages.map((message) => {
      const bubble = document.createElement('div');
      bubble.className = `helpbot-${message.role}`;
      if (message.localHtml) bubble.innerHTML = message.content;
      else if (message.role === 'assistant') appendAssistantText(bubble, message.content);
      else bubble.textContent = message.content;
      if (message.notice) {
        const note = document.createElement('p');
        note.className = 'helpbot-notice';
        note.textContent = message.notice;
        bubble.prepend(note);
      }
      if (message.sources?.length) {
        const sources = document.createElement('ul');
        sources.className = 'helpbot-sources';
        for (const source of message.sources) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = source.url;
          link.textContent = source.label;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          item.append(link);
          sources.append(item);
        }
        bubble.append(sources);
      }
      return bubble;
    }));
    log.scrollTop = log.scrollHeight;
  }

  function welcome() {
    if (messages.length) return;
    messages.push({ role: 'assistant', content: WELCOME_MESSAGE });
    renderLog();
  }

  function open() {
    welcomeShown = true;
    hideWelcomePreview();
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Close helpbot');
    welcome();
    input.focus();
  }

  function close(restoreFocus = true) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Open helpbot');
    if (restoreFocus) launcher.focus();
  }

  const onLaunch = () => (panel.hidden ? open() : close());
  launcher.addEventListener('click', onLaunch);
  dismissWelcome.addEventListener('click', dismissWelcomePreview);
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || (panel.hidden && welcomePreview.hidden)) return;
    event.preventDefault();
    if (panel.hidden) dismissWelcomePreview();
    else close();
  };
  root.addEventListener('keydown', onKeydown);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || text.length > HELPBOT_MESSAGE_LIMIT || activeRequest) return;
    const controller = new AbortController();
    activeRequest = controller;
    send.disabled = true;
    const history = messages.slice(1).filter((message) => !message.localHtml).slice(-HELPBOT_HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content: content.slice(0, HELPBOT_MESSAGE_LIMIT) }));
    input.value = '';
    messages.push({ role: 'user', content: text });
    const pending: ChatMessage = { role: 'assistant', content: 'Thinking…' };
    messages.push(pending);
    renderLog();
    try {
      const reply = await requestHelpbot(text, history, controller.signal);
      if (!controller.signal.aborted) {
        Object.assign(pending, reply);
        renderLog();
      }
    } finally {
      activeRequest = null;
      send.disabled = false;
    }
  };
  form.addEventListener('submit', onSubmit);

  return {
    showWelcomePreview,
    hideWelcomePreview,
    returnToTitle: () => {
      hideWelcomePreview();
      if (!panel.hidden) close(false);
    },
    destroy: () => {
      hideWelcomePreview();
      activeRequest?.abort();
      launcher.removeEventListener('click', onLaunch);
      dismissWelcome.removeEventListener('click', dismissWelcomePreview);
      root.removeEventListener('keydown', onKeydown);
      form.removeEventListener('submit', onSubmit);
      root.innerHTML = '';
    },
  };
}
