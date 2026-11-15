import { requestHelpbot } from './si-client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function mountHelpbot(root: HTMLElement): { destroy: () => void } {
  const messages: ChatMessage[] = [];
  root.innerHTML = `
    <button type="button" class="helpbot-launcher" aria-expanded="false" aria-controls="helpbot-panel">
      Helpbot
    </button>
    <div id="helpbot-panel" class="helpbot-panel" hidden>
      <header>
        <h2>Flame in Freefall Helpbot</h2>
        <button type="button" class="helpbot-close" aria-label="Close helpbot">×</button>
      </header>
      <div class="helpbot-log" role="log" aria-live="polite"></div>
      <form class="helpbot-form">
        <label class="sr-only" for="helpbot-input">Message</label>
        <input id="helpbot-input" type="text" autocomplete="off" placeholder="Ask where to find fire-safety evidence…" />
        <button type="submit">Send</button>
      </form>
    </div>
  `;

  const launcher = root.querySelector<HTMLButtonElement>('.helpbot-launcher')!;
  const panel = root.querySelector<HTMLElement>('.helpbot-panel')!;
  const log = root.querySelector<HTMLElement>('.helpbot-log')!;
  const form = root.querySelector<HTMLFormElement>('.helpbot-form')!;
  const input = root.querySelector<HTMLInputElement>('#helpbot-input')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('.helpbot-close')!;

  function renderLog() {
    log.innerHTML = messages
      .map((m) => `<div class="helpbot-msg helpbot-${m.role}"><div class="helpbot-bubble">${m.content}</div></div>`)
      .join('');
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
    welcome();
    input.focus();
  }

  function close() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  const onLaunch = () => (panel.hidden ? open() : close());
  launcher.addEventListener('click', onLaunch);
  closeBtn.addEventListener('click', close);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    messages.push({ role: 'user', content: text });
    messages.push({ role: 'assistant', content: 'Thinking…' });
    renderLog();
    const reply = await requestHelpbot(
      text,
      messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    );
    messages[messages.length - 1] = { role: 'assistant', content: reply };
    renderLog();
  };
  form.addEventListener('submit', onSubmit);

  return {
    destroy: () => {
      launcher.removeEventListener('click', onLaunch);
      closeBtn.removeEventListener('click', close);
      form.removeEventListener('submit', onSubmit);
      root.innerHTML = '';
    },
  };
}
