import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Dashboard } from './dashboard/dashboard';
import { Connect4Page } from './connect4/connect4-page';
import { Trivia } from './trivia/trivia';
import { Waifubot } from './waifubot/waifubot';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard, title: 'AnimoSpace' },
      { path: 'conecta4', component: Connect4Page, title: 'Conecta 4 · AnimoSpace' },
      { path: 'trivia', component: Trivia, title: 'Trivia · AnimoSpace' },
      { path: 'waifubot', component: Waifubot, title: 'WaifuBot · AnimoSpace' },
    ],
  },
  { path: '**', redirectTo: '' },
];
