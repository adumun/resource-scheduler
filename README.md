# Resource Scheduler

A complete, offline-first web application for **planning and assigning resources across time periods**. It ships a generic scheduling core that adapts to different domains — academic timetabling, sports tournaments, and operating-room planning — and runs entirely in the browser with no backend.

## Project

The application solves the general resource-scheduling problem: given a set of resources, activities, time. A solution is a set of assignments that respects hard constraints, minimizes soft-constraint penalties, and produces a scored, explainable result.

Everything runs client-side: the scheduling engine executes in a Web Worker, data persists in IndexedDB, and authentication is simulated locally.

## Architecture

The codebase is organized by responsibility (a pragmatic DDD layout) with high cohesion and low coupling:

```
src/
  domain/              Pure domain model (entities, constraints, problem/result, presets). No dependencies.
  scheduling-engine/   The solver: RNG, candidate generation, constraint evaluation, search, scoring, diagnostics.
  infrastructure/      IndexedDB, repositories, local auth (PBKDF2), import/export + schema validation.
  application/         Services (use-case orchestration), the Web Worker, and the worker client.
  presentation/        React UI: Zustand stores, components, pages, editors, views.
```

Dependency direction: `presentation → application → {domain, scheduling-engine, infrastructure}`; `infrastructure → domain`; `scheduling-engine → domain`. The domain and engine are pure and independently testable.

**State management — Zustand.** Chosen over Redux Toolkit for its minimal boilerplate and slice-friendly API, which fits a local-first app without ceremony. State is scoped: auth, schedules, and UI (theme/toasts) are separate stores; per-page form state stays local.

## Scheduling Engine

The engine exposes a small interface:

```typescript
interface SchedulingEngine {
  solve(problem: SchedulingProblem, options: SolverOptions, onProgress?, shouldCancel?): SchedulingResult[];
}
```

`SolverOptions` supports `maxIterations`, `timeoutMs`, `seed`, `optimizationLevel` (`fast | balanced | best`), and `alternativeCount`.

**Algorithm — greedy + randomized restarts + simulated-annealing local search:**

1. **Candidate generation.** For each activity instance, enumerate placements (slot × resource-combination) that satisfy *local* hard constraints: slot duration, allowed slots, resource availability, blocked slots, capacity, and equipment compatibility. Combinations are capped and randomly sampled when the product is large.
2. **Greedy assignment with restarts.** Instances are ordered most-constrained-first (fewest placements). A greedy pass picks a random feasible placement per instance, checking *global* hard constraints incrementally (resource overlap, group overlap, max-per-day, min-separation). This is restarted with different randomization, keeping the best (most assigned, then lowest penalty).
3. **Local search.** Moves re-slot or re-resource a random instance; worse moves are accepted with simulated-annealing probability (temperature cools over iterations). Unassigned instances are always accepted when a feasible placement appears. The best state is tracked.
4. **Alternatives.** The solver runs with derived seeds and deduplicates by assignment signature, returning up to `alternativeCount` distinct solutions sorted by score.

**Determinism.** A seeded Mulberry32 PRNG drives all randomization, so the same `seed` reproduces the same result.

**Scoring.** `score = 100 - totalPenalty` (clamped to 0–100) when there are zero hard violations, else 0. Each soft violation contributes `weight × 0.1` penalty points. The result reports satisfied/violated hard and soft constraints separately, plus diagnostics for unscheduled activities.

**Impossible problems.** When activities cannot be placed, the engine returns the best partial solution plus `diagnostics` explaining why (no feasible placement, insufficient availability, capacity/equipment elimination, or global conflicts) with actionable suggestions.

The engine runs in a **Web Worker** so the UI never freezes; progress (assigned/total, best score, elapsed) streams to the UI and the operation can be cancelled.

## Domain Model

| Concept | Description |
| --- | --- |
| `Schedule` | Aggregate root: config + solution history. |
| `Resource` | Anything assignable: person (teacher/referee/surgeon), location (room/pitch/OR), equipment. Has `kind`, `roles`, `attributes` (capacity, equipment), `availability`. |
| `Activity` | Something to schedule: class/match/procedure. Has `count` (instances), `durationMinutes`, `requirements` (role → candidate resources), `groupId`, `priority`. |
| `TimeSlot` | Recurring (`dayOfWeek`) or specific (`date`) time interval. |
| `Assignment` | Activity instance → slot + resources per role. |
| `Constraint` | Hard or soft rule (see below). |
| `SchedulingResult` | Assignments, unscheduled, score, violations, diagnostics. |

## Constraints

**Hard constraints** (violation ⇒ invalid solution): resource availability, blocked slots, resource capacity, equipment compatibility, no resource double-booking, no group overlap, max activities per day, minimum separation.

**Soft constraints** (violation ⇒ lower score): preferred time, preferred resource, uniform distribution across the week, plus soft variants of max-per-day and min-separation. Each soft constraint carries a `weight` (1–100).

Constraints are data-driven and configurable from the UI (Configure tab / wizard step 6).

## Persistence

Primary storage is **IndexedDB** (via the `idb` library) with three object stores: `schedules` (keyPath `id`), `users` (keyPath `id`, unique index `byEmail`), and `meta`. Each schedule — including its full solution history — is stored as one document.

Access goes through repository interfaces (`ScheduleRepository`, `UserRepository`) with IndexedDB implementations. The application and domain layers depend only on the interfaces, so a REST backend can replace the IndexedDB implementations later without touching business logic. `localStorage` holds only the session and theme preference.

## Authentication

Local-only, simulated. Passwords are hashed with **PBKDF2** (Web Crypto, 100k iterations, SHA-256, per-user salt) and stored in IndexedDB; the session is kept in `localStorage` and survives reloads. **This is not production-grade authentication** — there is no server-side rate limiting, rotation, or transport security. It exists only to meet the offline requirement.

## Import / Export

Schedules export to a versioned JSON envelope (`{ schemaVersion, exportedAt, schedule }`). Import validates the JSON structure, the schema version, required fields, and referential integrity (requirement candidates and constraint references must point to existing resources/activities). Invalid files are rejected with specific errors and never crash the app.

## Running

```bash
npm install
npm run dev
```

Then open the printed URL, register an account, and create a schedule. Use **Load demo data for preset** in the wizard to instantly populate a realistic dataset (academic, sports, or surgery), then run the engine.

## Testing

```bash
npm test
```

Tests use Vitest + React Testing Library (jsdom). Coverage includes:

- **Solver**: normal scheduling, resource collision, participant collision, impossible schedules (with diagnostics), soft-constraint scoring, determinism, alternatives.
- **RNG**: determinism, range, shuffle/pick correctness.
- **Persistence**: save/get/list/delete and solution-history round-trip (fake-indexeddb).
- **Auth**: register, login, duplicate email, wrong password, validation.
- **Import/export**: round-trip, corrupt JSON, bad schema version, missing fields, dangling references.
- **Components**: Button/Badge rendering and interaction.

## ADÜMÜN Labs: demo público aislado (ADU-180)

Resource Scheduler puede usarse como **experimento web con datos ficticios y sin credenciales**. Este modo no reemplaza la aplicación local ni convierte la autenticación simulada en un servicio real.

```bash
npm ci
npm test
npm run lint
npm run build:labs
npm run preview
# En otra terminal, sobre el preview local:
node scripts/smoke-labs.mjs --base=http://localhost:4173
```

El build `npm run build:labs` utiliza `.env.labs` y genera una SPA estática en `dist/`. En ese artefacto:

- La ruta `/demo` inicia una sesión **anónima y local** (`adumun-labs-demo`), sin registro, correo personal ni contraseña.
- `/login` y `/register` redirigen a `/demo`; el build normal `npm run build` conserva la experiencia original.
- Los datos, incluido el ejemplo de planificación, viven **solo en IndexedDB/localStorage del navegador**. No se sincronizan ni respaldan; se pierden al borrar los datos del sitio.
- La interfaz muestra permanentemente un aviso de modo experimental y un enlace de regreso a `https://labs.adumun.cl/`.
- Vite genera los assets y Cloudflare Pages usa `public/_redirects` para resolver rutas SPA directas/refresh.

**Cloudflare Pages, proyecto independiente por validar:** root `/`, build `npm run build:labs`, output `dist`, rama `master` solo después de revisión y QA del PR. No añadir el enlace `/demo` a Labs ni marcarlo publicado antes de verificar el dominio y los assets. No introducir secretos en `VITE_*`.

> Seguridad: ningún dato de usuarios ni proyectos reales debe entrar en esta demo. La autenticación anterior sigue siendo solo para uso local y nunca debe presentarse como un login de producción.

## Production build

```bash
npm run build
```

Type-checks (`tsc -b`) and bundles with Vite (client + worker chunks).

## Limitations

- **No backend.** All data lives in the browser (IndexedDB); clearing site data erases everything.
- **Authentication is simulated** and not secure for production.
- **Optimality is not guaranteed.** The solver is a heuristic; it finds good feasible solutions within the time budget, not the global optimum.
- **Manual editing uses click-to-move** (select a new slot/resources in a modal with live hard-constraint validation) rather than HTML5 drag-and-drop, which is more accessible and robust; the change is blocked if it introduces a hard violation.
- **Cancellation** discards the in-flight worker result; the worker finishes its bounded work in the background.
- **Weekly availability** does not automatically apply to date-based slots (and vice-versa); presets use matching slot/availability types.

## Future evolution

The repository abstraction and pure domain/engine boundaries are designed so the same application can grow into a multi-tenant SaaS without a rewrite:

- Swap `IndexedDbScheduleRepository` / `IndexedDbUserRepository` for REST implementations behind the same interfaces.
- Replace `LocalAuthService` with a real auth provider (OIDC/JWT) and add authorization.
- Move the scheduling engine to the server (the `SchedulingEngine` interface is transport-agnostic) and stream progress over WebSockets.
- Add collaboration/sync via CRDT or server reconciliation.
- Plug in advanced optimizers (OR-Tools, CP-SAT) behind the `SchedulingEngine` interface.
- Introduce multi-tenancy by scoping repositories on `ownerId`/tenant.
