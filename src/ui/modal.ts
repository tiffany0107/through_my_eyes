/** Centred modal card. Focuses the first button and keeps Tab inside. */
export function showModal(root: HTMLElement, content: HTMLElement, accent?: string): () => void {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  content.classList.add('card', 'modal');
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  const heading = content.querySelector('h1, h2');
  if (heading) {
    heading.id ||= 'modal-title-' + Math.random().toString(36).slice(2);
    content.setAttribute('aria-labelledby', heading.id);
  }
  if (accent) content.style.setProperty('--accent', accent);
  back.appendChild(content);
  root.appendChild(back);

  const focusables = () => [...content.querySelectorAll<HTMLElement>('button, input, select, a[href]')].filter((e) => !e.hasAttribute('disabled'));
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  content.addEventListener('keydown', onKey);
  requestAnimationFrame(() => (content.querySelector<HTMLElement>('.btn.primary') ?? focusables()[0])?.focus());
  return () => back.remove();
}

export function el(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d;
}
