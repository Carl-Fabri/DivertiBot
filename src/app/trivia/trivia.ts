import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TriviaService } from './trivia.service';
import { TRIVIA_CATEGORIES, TriviaCategory, TriviaQuestion } from './trivia.models';

type Phase = 'idle' | 'loading' | 'playing' | 'done';

@Component({
  selector: 'app-trivia',
  imports: [DecimalPipe],
  templateUrl: './trivia.html',
  styleUrl: './trivia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Trivia {
  private readonly api = inject(TriviaService);

  protected readonly categories = TRIVIA_CATEGORIES;
  protected readonly count = 5;

  protected readonly phase = signal<Phase>('idle');
  protected readonly category = signal<TriviaCategory>('General');
  protected readonly questions = signal<TriviaQuestion[]>([]);
  protected readonly index = signal(0);
  protected readonly picked = signal<number | null>(null);
  protected readonly correct = signal(0);
  protected readonly source = signal<'ia' | 'local'>('local');
  protected readonly tokens = signal(0);
  protected readonly quip = signal('Elige categoría y demuestra lo que sabes.');

  protected readonly current = computed<TriviaQuestion | undefined>(
    () => this.questions()[this.index()],
  );
  protected readonly answered = computed(() => this.picked() !== null);
  protected readonly isLast = computed(() => this.index() === this.questions().length - 1);
  protected readonly progressPct = computed(() =>
    this.questions().length ? ((this.index() + 1) / this.questions().length) * 100 : 0,
  );

  protected setCategory(c: TriviaCategory): void {
    this.category.set(c);
  }

  protected start(): void {
    this.phase.set('loading');
    this.quip.set('🤖 ÁnimoBot está preparando las preguntas…');

    this.api.getQuestions(this.count, this.category()).subscribe((res) => {
      this.tokens.update((t) => t + (res.usage?.total ?? 0));
      this.source.set(res.source);
      this.questions.set(res.questions);
      this.index.set(0);
      this.picked.set(null);
      this.correct.set(0);

      if (res.questions.length === 0) {
        this.phase.set('idle');
        this.quip.set('No pude cargar preguntas. Prueba otra vez.');
        return;
      }
      this.phase.set('playing');
      this.quip.set(
        res.source === 'ia'
          ? '¡Listas! A ver si me sorprendes 😏'
          : 'Sin conexión con la IA: van preguntas de la casa 🏠',
      );
    });
  }

  protected choose(i: number): void {
    if (this.answered() || !this.current()) return;
    this.picked.set(i);
    const q = this.current()!;
    if (i === q.answer) {
      this.correct.update((c) => c + 1);
      this.quip.set('¡Correcto! 🎉 ' + q.fun);
    } else {
      this.quip.set('Uy, no. ' + q.fun);
    }
  }

  protected next(): void {
    if (!this.answered()) return;
    if (this.isLast()) {
      this.phase.set('done');
      this.quip.set(this.resultQuip());
      return;
    }
    this.index.update((i) => i + 1);
    this.picked.set(null);
    this.quip.set('Siguiente pregunta…');
  }

  protected restart(): void {
    this.phase.set('idle');
    this.quip.set('Otra ronda. Elige categoría.');
  }

  protected optionClass(i: number): string {
    if (!this.answered()) {
      return 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50';
    }
    const answer = this.current()?.answer;
    if (i === answer) return 'border-emerald-400 bg-emerald-50 text-emerald-800';
    if (i === this.picked()) return 'border-rose-400 bg-rose-50 text-rose-800';
    return 'border-slate-200 bg-white opacity-60';
  }

  private resultQuip(): string {
    const total = this.questions().length;
    const ratio = total ? this.correct() / total : 0;
    if (ratio === 1) return '¡Pleno! ¿Seguro que no has hecho trampa? 🏆';
    if (ratio >= 0.6) return '¡Bien jugado! Se nota que descansas con cabeza.';
    if (ratio >= 0.3) return 'Ni tan mal. La próxima cae más alta.';
    return 'Tranqui, lo importante es el buen rollo. Revancha 😎';
  }
}
