import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_PREFS,
  WaifuMessage,
  WaifuPrefs,
  WaifubotService,
  fixReplyCasing,
} from './waifubot.service';

const STORAGE_KEY = 'waifubot.prefs';
const CHAT_KEY = 'waifubot.chat';
const MAX_STORED = 60;

function loadPrefs(): WaifuPrefs {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw);
    return {
      petNames:
        Array.isArray(p.petNames) && p.petNames.length
          ? p.petNames.map((x: unknown) => String(x)).slice(0, 8)
          : DEFAULT_PREFS.petNames,
      meow: typeof p.meow === 'string' && p.meow.trim() ? p.meow.trim().slice(0, 20) : DEFAULT_PREFS.meow,
      shout: typeof p.shout === 'boolean' ? p.shout : DEFAULT_PREFS.shout,
      sweetness: [1, 2, 3].includes(p.sweetness) ? p.sweetness : DEFAULT_PREFS.sweetness,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(p: WaifuPrefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* modo incógnito o storage lleno: se ignora */
  }
}

function makeGreeting(p: WaifuPrefs): string {
  const cased = (s: string) => (p.shout ? s.toUpperCase() : s.toLowerCase());
  const name = cased(p.petNames[0] || 'mi rey');
  const meow = cased(p.meow || 'miau');
  return `¡${meow}! Aquí estoy para ti, ${name}. Cuéntame qué te preocupa y lo vemos juntos 🐾`;
}

/** Recupera la conversación guardada; si no hay, arranca con el saludo */
function loadMessages(p: WaifuPrefs): WaifuMessage[] {
  const greeting: WaifuMessage = { role: 'assistant', content: makeGreeting(p), at: Date.now() };
  if (typeof localStorage === 'undefined') return [greeting];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [greeting];
    const arr = JSON.parse(raw);
    const valid: WaifuMessage[] = Array.isArray(arr)
      ? arr.filter(
          (m: unknown): m is WaifuMessage =>
            !!m &&
            (( m as WaifuMessage).role === 'user' || (m as WaifuMessage).role === 'assistant') &&
            typeof (m as WaifuMessage).content === 'string',
        )
      : [];
    return valid.length ? valid : [greeting];
  } catch {
    return [greeting];
  }
}

function saveMessages(msgs: WaifuMessage[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
  } catch {
    /* modo incógnito o storage lleno: se ignora */
  }
}

@Component({
  selector: 'app-waifubot',
  imports: [FormsModule],
  templateUrl: './waifubot.html',
  styleUrl: './waifubot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Waifubot {
  private readonly api = inject(WaifubotService);
  private readonly scrollBox = viewChild<ElementRef<HTMLElement>>('scrollBox');

  protected readonly prefs = signal<WaifuPrefs>(loadPrefs());

  // borrador del panel de preferencias
  protected readonly showSettings = signal(false);
  protected readonly petNamesDraft = signal(this.prefs().petNames.join(', '));
  protected readonly meowDraft = signal(this.prefs().meow);
  protected readonly shoutDraft = signal(this.prefs().shout);
  protected readonly sweetnessDraft = signal<1 | 2 | 3>(this.prefs().sweetness);

  protected readonly messages = signal<WaifuMessage[]>([
    { role: 'assistant', content: makeGreeting(this.prefs()), at: Date.now() },
  ]);
  protected readonly draft = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resetHover = signal(false);

  protected readonly quickReplies = [
    'Me siento agobiado/a 😮‍💨',
    'He tenido un mal día',
    'Necesito ánimos',
    'Estoy nervioso/a por un examen',
    'No consigo dormir',
    'Me vendría bien un abrazo 🤗',
  ];

  protected readonly previewNames = computed(() => {
    const p = this.prefs();
    const cased = (s: string) => (p.shout ? s.toUpperCase() : s.toLowerCase());
    return p.petNames.map(cased).join(' · ');
  });

  constructor() {
    // Tras la hidratación, recupera la conversación guardada (si la hay)…
    afterNextRender(() => {
      const stored = loadMessages(this.prefs());
      if (stored.length > 1) {
        this.messages.set(stored);
        this.scrollToBottom();
      }
    });
    // …y la guarda en cada cambio, para que sobreviva a cambiar de sección
    // o recargar la página.
    effect(() => saveMessages(this.messages()));
  }

  protected toggleSettings(): void {
    if (!this.showSettings()) {
      // sincroniza el borrador con lo guardado al abrir
      this.petNamesDraft.set(this.prefs().petNames.join(', '));
      this.meowDraft.set(this.prefs().meow);
      this.shoutDraft.set(this.prefs().shout);
      this.sweetnessDraft.set(this.prefs().sweetness);
    }
    this.showSettings.update((v) => !v);
  }

  protected savePreferences(): void {
    const petNames = this.petNamesDraft()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    const next: WaifuPrefs = {
      petNames: petNames.length ? petNames : DEFAULT_PREFS.petNames,
      meow: this.meowDraft().trim() || DEFAULT_PREFS.meow,
      shout: this.shoutDraft(),
      sweetness: this.sweetnessDraft(),
    };

    this.prefs.set(next);
    savePrefs(next);
    this.showSettings.set(false);

    // si la conversación aún no ha empezado, actualiza el saludo
    if (this.messages().length === 1) {
      this.messages.set([{ role: 'assistant', content: makeGreeting(next), at: Date.now() }]);
    }
  }

  protected restoreDefaults(): void {
    this.petNamesDraft.set(DEFAULT_PREFS.petNames.join(', '));
    this.meowDraft.set(DEFAULT_PREFS.meow);
    this.shoutDraft.set(DEFAULT_PREFS.shout);
    this.sweetnessDraft.set(DEFAULT_PREFS.sweetness);
  }

  /** Botón de respuesta rápida: rellena y envía el mensaje */
  protected sendQuick(text: string): void {
    if (this.loading()) return;
    this.draft.set(text);
    this.submit();
  }

  protected submit(): void {
    const text = this.draft().trim();
    if (!text || this.loading()) return;

    this.messages.update((l) => [...l, { role: 'user', content: text, at: Date.now() }]);
    this.draft.set('');
    this.error.set(null);
    this.loading.set(true);
    this.scrollToBottom();
    this.ask();
  }

  protected retry(): void {
    if (this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    this.ask();
  }

  private ask(): void {
    this.api.send(this.messages(), this.prefs()).subscribe({
      next: (reply) => {
        this.messages.update((l) => [
          ...l,
          { role: 'assistant', content: fixReplyCasing(reply, this.prefs()), at: Date.now() },
        ]);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  /** Botón "Reiniciar": vuelve a empezar la conversación */
  protected resetChat(): void {
    this.messages.set([{ role: 'assistant', content: makeGreeting(this.prefs()), at: Date.now() }]);
    this.draft.set('');
    this.error.set(null);
    this.loading.set(false);
    this.resetHover.set(false);
  }

  protected onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  protected trackByIndex(i: number): number {
    return i;
  }

  private scrollToBottom(): void {
    if (typeof requestAnimationFrame === 'undefined') return;
    requestAnimationFrame(() => {
      const el = this.scrollBox()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
