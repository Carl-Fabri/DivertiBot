# AnimoSpace

Dashboard en **Angular 21 (SSR) + Tailwind v4** con **barra lateral** (Dashboard · Conecta 4 ·
Trivia · WaifuBot) y un **botón flotante que abre una interfaz de chat**. Los chats y la trivia
hablan con un **agente gratuito a través de OpenRouter**, servido por un **proxy en el servidor**
para que la API key nunca llegue al navegador.

## 🔗 Demo en vivo

**<https://diverti-14grj3iw1-elfabriciof-5588s-projects.vercel.app>**

Desplegado en Vercel. Si algún chat o la trivia no responde, suele ser el límite de uso del modelo
gratuito de OpenRouter: espera un momento y reintenta (la trivia cae a su banco local).

---

## 1. La problemática (por qué existe ÁnimoBot)

Estudiar o trabajar muchas horas seguidas desgasta: baja la motivación, sube el estrés y los
"descansos" acaban siendo *scroll infinito* que cansa todavía más. Falta un empujón **rápido,
ligero y positivo**.

**ÁnimoBot** es un agente de chat con humor amable pensado para los micro-descansos:

| Situación | Qué hace ÁnimoBot |
|-----------|-------------------|
| Llevas 2 horas sin levantarte y estás saturado/a | Te suelta un chiste malo o un dato curioso en 2 frases |
| Necesitas moverte pero te da pereza | Te lanza un reto físico de 30 segundos |
| Estás desmotivado/a con una tarea larga | Frase de ánimo concreta + técnica (respiración 4-7-8, Pomodoro) |
| Se nota que lo estás pasando mal de verdad | Baja el chiste, valida cómo te sientes y sugiere parar / hablar con alguien |

**Reglas del agente** (ver `src/app/chat/chat.service.ts` → `ANIMOBOT_SYSTEM_PROMPT`):
español siempre, respuestas cortas, humor blanco (nada ofensivo/político/sexual), máximo un emoji.

Variantes fáciles de adaptar cambiando solo ese *system prompt*:
- **EstudiaBot** (educativo): explica temas, genera mini-quizzes, resume apuntes.
- **OrientaBot** (ayuda social): orienta en trámites y recursos en lenguaje claro.

---

## 2. Puesta en marcha

### Requisitos
- Node.js 20.6+ (probado con 25) y npm.
- Una API key gratuita de OpenRouter: <https://openrouter.ai/keys>

### Pasos

```bash
npm install

# 1. Crear el archivo de entorno a partir de la plantilla
cp .env.example .env        # en Windows PowerShell: Copy-Item .env.example .env

# 2. Editar .env y pegar tu clave real
#    OPENROUTER_API_KEY=sk-or-...

# 3. Arrancar en desarrollo (SSR + API en el mismo proceso)
npm start                    # http://localhost:4200
```

Abre `http://localhost:4200`, pulsa el botón 💬 abajo a la derecha y escribe.

> El archivo `.env` está en `.gitignore`: **no se sube al repositorio**.

### Producción

```bash
npm run build
node dist/animospace/server/server.mjs   # usa las variables de entorno del sistema o el .env
```

---

## 3. Cómo funciona la integración con OpenRouter

```
Navegador ──POST /api/chat──▶ Servidor Express (src/server.ts) ──▶ OpenRouter API ──▶ modelo :free
  (sin API key)                 (añade Authorization: Bearer OPENROUTER_API_KEY)
```

- **`src/server.ts`** — endpoint `POST /api/chat`. Lee `OPENROUTER_API_KEY` del entorno, recorta el
  historial a los últimos 20 mensajes, añade el *system prompt*, llama a
  `https://openrouter.ai/api/v1/chat/completions` y devuelve `{ reply, model }`. Gestiona errores
  (falta de key → 500, rate limit → 429, timeout de 45 s → 504).
- **`src/app/chat/chat.service.ts`** — servicio Angular que hace el `POST` y normaliza errores.
- **`src/app/chat/chat-widget.ts` / `.html` / `.css`** — el FAB + panel: mensajes, indicador de
  "escribiendo…", sugerencias rápidas, reintento y envío con Enter.
- **`src/app/dashboard/`** — el dashboard (KPIs, gráfico de ánimo semanal, actividad) que incrusta
  `<app-chat-widget />`.

### Modelo gratuito

Por defecto `meta-llama/llama-3.3-70b-instruct:free`. Se cambia con `OPENROUTER_MODEL` en `.env`
(hay una lista de alternativas gratuitas en `.env.example`). Los modelos `:free` tienen límites de
uso; si ves un error 429, espera un momento o cambia de modelo.

---

## 4. Módulo de juego: Conecta 4 contra ÁnimoBot

Módulo propio en la ruta **`/conecta4`** (`src/app/connect4/`): `connect4.ts` es el juego y
`connect4-page.ts` la página con su cabecera.

**Diseñado para gastar los mínimos tokens de OpenRouter:**

- **Reglas y detección de victoria en el navegador** (`connect4.engine.ts`), no en el modelo.
- Solo se llama al modelo **en el turno del bot**. Se le manda el tablero como 6 líneas de 7
  caracteres (`.`, `R`, `Y`) + las columnas jugables, y responde **solo** con
  `{"col": <n>, "quip": "<pique corto>"}` (`max_tokens` ≈ 80, sin historial).
- Si el modelo devuelve una columna ilegal, o falla la petición, o **no hay API key**, entra la
  **heurística local** (`localBestMove`: gana / bloquea / evita regalar / centro) → **0 tokens** y
  la partida nunca se rompe.
- El panel muestra un **contador de tokens** acumulados de la sesión.

Coste típico por partida con este diseño: ~5k tokens (≈30 llamadas cortas), frente a ~60k+ de un
ajedrez. El endpoint es `POST /api/connect4` en `src/server.ts`.

## 5. Navegación (left bar) y módulos

Barra lateral izquierda (`src/app/layout/`) con cuatro apartados:

| Apartado | Ruta | Contenido |
|---|---|---|
| **Dashboard** | `/dashboard` | KPIs, ánimo semanal, actividad y accesos a los módulos |
| **Conecta 4** | `/conecta4` | Juego contra ÁnimoBot |
| **Trivia** | `/trivia` | Preguntas tipo test con ÁnimoBot |
| **WaifuBot** | `/waifubot` | Chat de apoyo emocional con lenguaje cariñoso configurable |

El botón 💬 del chat de ÁnimoBot es **global**: aparece en todas las páginas. En móvil la barra se
pliega detrás de un botón de menú.

### Trivia (`src/app/trivia/`)

- Eliges categoría y ÁnimoBot genera **un lote de 5 preguntas en UNA sola llamada** a
  `POST /api/trivia` (JSON: `{q, options[4], answer, fun}`), no una llamada por pregunta.
- Corrección y puntuación en el navegador; al acertar/fallar se muestra un **dato curioso**.
- Sin API key o si falla → **banco local** de preguntas (`trivia.bank.ts`), 0 tokens.
- Pie de página con el origen de las preguntas (IA / local) y los tokens de la sesión.

### WaifuBot (`src/app/waifubot/`)

Chat pensado para contarle un problema y recibir **apoyo emocional + consejos prácticos** con tono
cariñoso y felino.

- **Panel de preferencias dentro del propio módulo** (`⚙️ Preferencias de lenguaje`): editas los
  **apelativos** (`mi rey, amo, cielo, bichito`…), la **muletilla** (`MIAU`), si van en
  **MAYÚSCULAS** y el **nivel de cariño** (Sobrio / Cariñoso / Muy meloso). Se guardan en
  `localStorage` y se inyectan en el *system prompt* que arma `buildWaifuSystemPrompt()`.
- **Mayúsculas controladas**: el prompt indica poner en MAYÚSCULAS *solo* los apelativos y la
  muletilla (no frases enteras), y `fixReplyCasing()` corrige en el cliente las respuestas que
  llegan «gritando».
- **Botones de respuesta rápida** encima del campo de texto (*"He tenido un mal día"*,
  *"Necesito ánimos"*, *"No consigo dormir"*…) que envían el mensaje de un clic.
- Reutiliza el endpoint `POST /api/chat` (mismo proxy, otro *system prompt*).
- Botón **«Reiniciar»** que reinicia la conversación y, **al pasar el ratón por encima**, muestra
  una **carita triste** (😿) y cambia a «Reiniciar 😢».
- Salvaguarda: ante señales de angustia real, el prompt le indica bajar el tono y sugerir ayuda de
  personas de confianza o profesionales.

## 6. Tema visual (oscuro + franjas)

- **Tema oscuro** por defecto con **familia de color ámbar/naranja** (acento `#f59e0b`, secundario
  coral). Toda la paleta está centralizada en variables CSS al principio de
  [`src/styles.css`](src/styles.css) (`--bg`, `--surface`, `--accent`, `--text`…): cambiando esas
  variables cambia el aspecto de toda la app.
- Debajo de las variables, `styles.css` **remapea las clases claras de Tailwind**
  (`bg-white`, `text-slate-*`, `bg-indigo-*`, `bg-pink-*`, estados `emerald/rose/sky`…) a la paleta
  oscura, así los componentes no necesitan clases `dark:`.
- **Franjas blancas separadoras**: la clase `.page-stack` (en el contenedor de cada página) dibuja
  una línea blanca a lo ancho entre cada sección (encabezado · KPIs · módulos…).

## 7. Comandos

| Comando | Qué hace |
|---------|----------|
| `npm start` | Servidor de desarrollo con SSR y la API en `http://localhost:4200` |
| `npm run build` | Build de producción + prerender (salida en `dist/animospace/`) |
| `npm test` | Tests unitarios (Vitest) |

## 8. Despliegue en Vercel

**Sí se puede**, aunque tenga el backend dentro. Es una app **Angular SSR** (`outputMode: "server"`)
y Vercel la detecta sin configuración: publica los assets del navegador en la CDN y convierte
`server.mjs` en una **función serverless**. El `app.listen()` de `src/server.ts` está protegido por
`isMainModule(...)`, así que en Vercel no arranca un servidor propio: solo se usa el handler
exportado `reqHandler`.

Encaja bien porque los endpoints (`/api/chat`, `/api/connect4`, `/api/trivia`) son **sin estado**:
solo hacen de proxy a OpenRouter. Nada de sesiones en memoria ni websockets.

**Pasos:**

1. Sube el repo a GitHub e **importa el proyecto en Vercel** (framework: Angular, detectado solo).
2. En *Settings → Environment Variables* añade **`OPENROUTER_API_KEY`** (y si quieres
   `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`). El `.env` local **no** se
   sube (está en `.gitignore`); `loadEnv()` simplemente no hace nada y se usan las variables de
   Vercel.
3. **Hosts permitidos (anti-SSRF de Angular):** ya está configurado en `angular.json`
   → `security.allowedHosts: ["localhost", "*.vercel.app"]`. Si usas **dominio propio**, añádelo
   ahí (`"animospace.com"`) o define la variable de entorno **`NG_ALLOWED_HOSTS`**
   (`animospace.com,*.vercel.app`) en Vercel.
4. Si el SSR cae a render de cliente por las cabeceras del proxy, añade en Vercel
   **`NG_TRUST_PROXY_HEADERS=x-forwarded-host,x-forwarded-proto`**.

### Timeouts en Vercel (`Ups: [object Object]` / respuestas que fallan)

Las funciones del plan *Hobby* cortan a los ~10 s. Si el modelo `:free` de OpenRouter tarda más,
Vercel corta la función y devuelve **su propio** cuerpo de error (`{ error: { code, message } }`);
por eso antes aparecía `Ups: [object Object]`. Ya está mitigado:

- El cliente ahora normaliza cualquier forma de error a texto (`src/app/shared/error-message.ts`).
- El proxy aborta a los **25 s** (ajustable con `OPENROUTER_TIMEOUT_MS`) para devolver un JSON claro
  antes de que la plataforma lo mate.

Para que responda rápido en Vercel, define en *Environment Variables* un **modelo gratuito veloz**,
p. ej.:

```
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
# o: meta-llama/llama-3.2-3b-instruct:free
```

Si tu plan lo permite, puedes subir el límite de la función creando un `vercel.json`
(`functions` → `maxDuration`).

Generado con Angular CLI 21.2.9.
