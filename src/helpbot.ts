import { requestHelpbot } from './si-client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  localHtml?: boolean;
}

export function mountHelpbot(root: HTMLElement): { destroy: () => void } {
  const messages: ChatMessage[] = [];
  root.innerHTML = `
    <button type="button" class="helpbot-launcher" aria-label="Open helpbot" aria-expanded="false" aria-controls="helpbot-panel">
      <span class="helpbot-icon" aria-hidden="true"></span>
    </button>
    <section id="helpbot-panel" class="helpbot-panel" aria-label="Helpbot" hidden>
      <div class="helpbot-log" role="log" aria-label="Conversation" tabindex="0"></div>
      <form class="helpbot-form">
        <label class="sr-only" for="helpbot-input">Message</label>
        <input id="helpbot-input" type="text" autocomplete="off" placeholder="Ask where to find fire-safety evidence…" />
        <button type="submit">Send</button>
      </form>
    </section>
  `;

  const launcher = root.querySelector<HTMLButtonElement>('.helpbot-launcher')!;
  const panel = root.querySelector<HTMLElement>('.helpbot-panel')!;
  const log = root.querySelector<HTMLElement>('.helpbot-log')!;
  const form = root.querySelector<HTMLFormElement>('.helpbot-form')!;
  const input = root.querySelector<HTMLInputElement>('#helpbot-input')!;
  function renderLog() {
    log.replaceChildren(...messages.map((message) => {
      const bubble = document.createElement('div');
      bubble.className = `helpbot-${message.role}`;
      if (message.localHtml) bubble.innerHTML = message.content;
      else bubble.textContent = message.content;
      return bubble;
    }));
    log.scrollTop = log.scrollHeight;
  }

  function welcome() {
    if (messages.length) return;
    messages.push({
      role: 'assistant',
      content:
        'Welcome to Flame in Freefall. Ask where to find fire-safety information — for example “Saffire flame spread”, “Nomex oxygen limit”, or “EMU atmosphere”. Answers cite the curated NASA corpus.',
    });
    renderLog();
  }

  function open() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Close helpbot');
    welcome();
    input.focus();
  }

  function close() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Open helpbot');
    launcher.focus();
  }

  const onLaunch = () => (panel.hidden ? open() : close());
  launcher.addEventListener('click', onLaunch);
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || panel.hidden) return;
    event.preventDefault();
    close();
  };
  root.addEventListener('keydown', onKeydown);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    messages.push({ role: 'user', content: text });
    const pending: ChatMessage = { role: 'assistant', content: 'Thinking…' };
    const history = messages.map(({ role, content }) => ({ role, content }));
    messages.push(pending);
    renderLog();
    Object.assign(pending, await requestHelpbot(text, history));
    renderLog();
  };
  form.addEventListener('submit', onSubmit);

  return {
    destroy: () => {
      launcher.removeEventListener('click', onLaunch);
      root.removeEventListener('keydown', onKeydown);
      form.removeEventListener('submit', onSubmit);
      root.innerHTML = '';
    },
  };
}
