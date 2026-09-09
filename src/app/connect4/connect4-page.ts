import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Connect4 } from './connect4';

@Component({
  selector: 'app-connect4-page',
  imports: [Connect4],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-slate-800">
      <div class="page-stack mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <header class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-2xl">🔴</span>
          <div>
            <h1 class="text-xl font-bold text-slate-900 md:text-2xl">Conecta 4 contra ÁnimoBot</h1>
            <p class="text-sm text-slate-500">
              Tú eres rojo, el bot es amarillo. El motor y las reglas corren en tu navegador; solo el
              turno del bot llama a OpenRouter (respuesta mínima en JSON).
            </p>
          </div>
        </header>

        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <app-connect4 />
        </section>
      </div>
    </div>
  `,
})
export class Connect4Page {}
