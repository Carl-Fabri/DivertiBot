import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'dashboard', renderMode: RenderMode.Prerender },
  { path: 'conecta4', renderMode: RenderMode.Prerender },
  { path: 'trivia', renderMode: RenderMode.Prerender },
  { path: 'waifubot', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server },
];
