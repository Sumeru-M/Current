# Current — AI intent engine for going out

Two applications, one platform, one service layer.

- **Consumer app** (`/`) — describe a night in plain language, get ranked venues with the reason each was chosen.
- **Business portal** (`/business`) — venues keep live state current, post instants, and see what demand they are winning or losing.

Everything is backed by mock services behind typed contracts. Swapping in a real backend is a change to one file.

```bash
npm run dev      # http://localhost:3000
npm run build
npx tsc --noEmit && npx eslint src
```

---

## Architecture

```
src/
  app/                     routes only — thin, no logic
    (consumer)/            consumer route group + shell
    business/              business route group + shell
  features/                self-contained feature slices
    intent/                composer, chips, clarification, canvas
    recommendations/       cards, list, results screen
    venue/                 detail, gallery, instants, booking
    business/              live console, analytics, instants, profile
    saved/ bookings/ profile/
  components/
    ui/                    design-system primitives (button, card, field, dialog…)
    domain/                cross-app domain components (match, live indicators, media)
    layout/                shells and page header
  services/
    contracts.ts           ← the only thing the UI depends on
    mock/                  mock implementations (deleted when the API lands)
    index.ts               container / DI seam
    query-keys.ts          centralised cache keys
  stores/                  client state (intent session, saved)
  hooks/                   query + mutation hooks — components never call services directly
  config/                  verticals, app constants, navigation
  types/                   domain model
  mocks/                   fixtures + deterministic runtime helpers
  lib/                     formatting, cn, zod resolver
```

**Dependency rule:** `app → features → components → lib`. Features never import other features' internals; anything shared moves to `components/domain` or `lib`.

---

## The decisions that matter

### 1. Vertical-agnostic domain model

`Venue`, `Availability`, `Offer`, `Recommendation`, `Business` — "club" is a `verticalId` on a row, never a type. `config/verticals.ts` is a registry describing each vertical's noun, booking noun, whether live occupancy/queue/instants apply, and which attributes surface on a card. Components read the descriptor.

Adding restaurants = one registry entry + fixtures. Nothing in the render path branches on vertical.

### 2. Match score is an explanation, not a number

`MatchExplanation` carries per-factor contributions with a human claim each (`services/mock/ranking.ts`). `score` is derived and always decomposable. The consumer sees the strongest claim; the venue sees which factor is costing rank and the action that fixes it — from the same factor ids, so advice can never contradict the algorithm.

*Alternative considered:* a single embedding-cosine score. Ranks well, explains nothing — and "why am I fourth?" is the first question every club owner asks. Long term the two compose: embeddings become a `semanticFit` factor with its own weight and claim.

Four ranking judgements worth naming:

- **Occupancy is non-monotonic.** Peak desirability is "Busy", not "Nearly full". "Fuller = rank higher" would funnel every group into the one room already at capacity.
- **Budget is a fit score, not a cheapness score.** Someone who says ₹3,000 has decided to spend roughly ₹3,000. Ranking the ₹400 option top answers a question they did not ask and systematically buries premium venues.
- **Vibe affinity is positional.** A venue's *first* genre counts more than its third. Without this, a ₹200 student bar outranked the city's dedicated techno room — and every venue's optimal strategy would be to tag every genre.
- **Vibe matching is synonym-aware** (`config/vibes.ts`). Users say "rooftop"; venue copy says "fourteenth-floor terrace". Substring equality dropped the single most relevant venue in the city — a room literally named *Halcyon Rooftop* — from a rooftop search.

### 2a. Occupancy is a band, not a percentage

`Availability.occupancyBand` (`Plenty of space` / `Filling up` / `Busy` / `Nearly full`) is the source of truth; `occupancyPct` is nullable and optional.

This inversion is the point. A door manager asked for "% full" invents a number, and an invented number poisons every recommendation downstream — so we never ask. The live console offers four large targets and nothing else; exact counts are an opt-in disclosure for venues that genuinely measure them (ticketed entry, door-counting hardware).

Consequences that fall out of treating the band as primary:

- Every occupancy surface must look **complete with no percentage**, because in production most rows will have none. Verified by seeding two-thirds of fixtures with `occupancyPct: null`.
- **Total capacity moved to `Venue`** and is shown alongside the band. "Busy" in a 40-seat listening bar is not "Busy" in a 700-capacity club, and capacity is editorial — it changes with a licence, not with a shift.
- Headcount from a band renders as a **range** ("roughly 250–320 of 400"), never a point estimate. Claiming to know 312 people are inside when a manager tapped "Busy" would be a fabrication.
- The band **never drifts** in the mock. Silently reclassifying a venue's "Busy" as "Nearly full" would show them saying something they never said. Only hardware-fed percentages move.
- `energy` was **deleted**. It duplicated the band's vocabulary ("Filling up" in two places on one screen); band + queue trend carries it.

### 2b. Instants

Short-lived photos and ≤10s clips from inside the room, modelled as `Instant` and served by `InstantService`.

They surface where the decision is actually made: when a venue has a live instant, **the recommendation card's hero becomes the instant** and plays in place. Burying proof-of-the-room two taps deeper on a profile nobody opens would waste the format.

- Clip length is validated against **decoded metadata**, not the file name or size — client-side to save a manager a 40MB upload we'd reject, and the same check belongs server-side when one exists.
- Playback progress for a clip is driven by the video's own `timeupdate`, not a timer racing the decoder.
- Expiry is enforced **on read**, so no sweeper job exists and no expired instant can ever be served.
- Uploads are real object URLs — they play, they preview in the exact viewer guests use, and they do **not** survive a refresh. The UI says so rather than implying durability we don't have.

### 2c. Voice is the primary input

On a phone outside a venue, saying *"six of us, techno, under ₹3,000 each"* takes about four seconds. Typing it takes twenty, plus both hands and your attention. So the landing screen leads with a microphone and keeps the keyboard one tap away — never buried behind a failure state, because voice fails in exactly the loud rooms this app is used in.

**On Wispr Flow:** it is a dictation *app*, not an embeddable SDK — it types into other apps at the OS level, and its developer page routes integration questions to sales. Two consequences: (1) users who have it can already dictate into our text field with zero work from us, and (2) in-app voice needs a different engine. So `services/speech/contract.ts` is the seam, and the browser's Web Speech API is the implementation behind it. Whisper, Deepgram, or a Wispr dictation API drop in without a component change.

- The contract is **streaming**, not record-then-transcribe. Watching your words appear is what makes a mic feel like it is listening rather than buffering.
- `lang: "en-IN"` — the same engine on `en-US` mangles *Indiranagar* and *Koramangala*, the words users are most likely to say.
- **Tap to start, tap to stop**, not press-and-hold: a hold gesture that slips loses the whole utterance, and only a visible Stop works one-handed.
- It **submits itself**. Making someone speak and then hunt for a send button spends the time voice just saved. Misheard words are fixed through the intent chips — one tap, no re-record.
- Support detection goes through `useSyncExternalStore` with an optimistic server snapshot. A plain render-time check renders a text field on the server and a mic on the client, which is a hydration error — caught and fixed in testing.
- A hard 15-second ceiling per utterance, single-fire `onEnd`, and mic release on unmount, so a session can never hang in "listening" or leave the mic open.

Spoken input has no ₹ symbol and no comma grouping — verified that *"under 3000 each"* still parses to a ₹3,000 budget.

### 3. Service layer as the only seam

The UI depends on `services/contracts.ts`, never an implementation. `services/index.ts` is a container; the real-backend switch is:

```ts
return process.env.NEXT_PUBLIC_API_MODE === "http"
  ? createHttpServices(config)
  : createMockServices();
```

Every method is already async and batched where it needs to be (`availability.getMany` exists so list screens never make N calls). Components call hooks; hooks call services. Cache policy lives in `hooks/use-domain-queries.ts` alone.

### 4. Server cache vs client state

- **TanStack Query** for anything owned by the server. Live availability polls every 12s (worst-case staleness < 20s, per the product requirement).
- **Zustand** for the intent session and saved list — sequential, user-owned, must survive navigation without a refetch or an empty flash. Modelling a mutable draft as a query means fighting the cache; context would re-render every consumer on each keystroke.

Live publishing is **optimistic** with rollback: a door manager updating a queue on a phone in a loud room must see it land instantly, or they stop using the tool — and the data quality the whole engine depends on dies with it.

### 5. Motion is CSS, not JavaScript

Entrance animations are declared so the **resting state is the visible one**; keyframes only describe where an element comes *from*. This was not a preference — during testing the JS animation frameloop stalled and froze recommendation cards at `opacity: 0`. Content visibility must never depend on an animation completing. The animation library was removed entirely; `prefers-reduced-motion` is honoured globally in `globals.css`.

### 6. Deliberate non-integrations

Each is a swap behind an existing interface, not a rewrite:

| Not built | Why | What replaces it |
| --- | --- | --- |
| Real map | An API key, a billing account, and a default basemap that cheapens a premium UI | `features/venue/venue-map.tsx`, same props |
| Image CDN | Demo must render in a club basement with no wifi; we hold no licence for real venue photography | `MediaAsset.url` already exists — set it and `MediaSurface` renders bytes |
| Durable media storage | Instants upload and play for real via object URLs, but don't survive a refresh — signed uploads need a backend | `InstantService.create` + `handleFile` |
| Payments | No rails, no venue-side confirmation. Bookings are honest **holds** with a door reference | `BookingService` |
| `shadcn/ui` CLI | Vendors Radix + generic styling we'd fight to reach an Apple/Linear feel; `@hookform/resolvers` also has a broken peer graph in this tree | Hand-written primitives (`cva` + `tailwind-merge`) and a 12-line Zod resolver |

### 7. Determinism

Mock data is seeded (`mocks/runtime.ts`, mulberry32) — identical on every machine, so a pitch never renders differently twice and screenshots are diffable. Telemetry drifts within bounded ranges per clock-minute so the demo looks alive without being random. Simulation state resets on hard refresh (a demo starting from a colleague's half-edited state is worse); saved venues persist, because that is user data.

---

## Accessibility

WCAG 2.1 AA targeted throughout: skip link, focus-visible on every interactive surface, labelled form controls with `aria-describedby` wired by the `Field` component (not left to call sites), `role="dialog"` with focus trap and restore, `aria-live` on results and toasts, keyboard-operable story viewer (arrows + Escape), `role="meter"` on capacity, reduced motion respected globally, and 44px minimum targets on the live console.

## Known gaps

- No test suite yet. The ranking engine and intent parser are pure functions with no I/O — they are the first things to cover, and the service container already accepts stubs via `__setServices`.
- Reviews, real notifications/push, and multi-city support are modelled in types but not built.
- Live updates are polled, not pushed. SSE/WebSockets are the right answer at scale; the transport swaps under the existing hooks without touching components.
