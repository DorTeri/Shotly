# Shotly

> The photographer captures the wedding. The guests capture everything else.

A mobile web camera that lives on wedding guests' phones. Fifteen shots each, no
preview, no retakes — photos develop 25 minutes later in a shared Darkroom, and the
whole wedding is revealed the next morning.

Israel-first: Hebrew guest UI, full RTL, built for 350–500 guest weddings.

## Running it

```bash
npm install
cp .env.example .env
npm run db:up      # local Postgres in Docker on 5433
npm run db:migrate
npm run db:seed    # prints the URLs below
npm run dev
```

The seed prints a camera link, a venue screen, a studio token and a second wedding
that sits mid-ceremony so Ceremony Mode is demoable.

Two environment notes on this machine: the native SWC binary is blocked by an
Application Control policy, so `dev` and `build` run `--webpack` rather than
Turbopack; and `DATABASE_URL` uses `127.0.0.1` rather than `localhost`, because on
Windows `localhost` resolves to `::1` first while Docker publishes IPv4 only.

## Where things stand

**Working end to end** — guest camera with the no-preview shutter, the offline
upload queue, the Darkroom develop delay, reactions, challenges paying out in film,
secret frames, voice notes, the contact ask, Ceremony Mode, the guest's own contact
sheet, the venue projector, and the printable Camera Pass with its MC script.

**Not built yet** — the couple's setup flow and post-wedding studio, the next-day
reveal sequence, awards, live missions, Best Man Mode moderation, payments, and the
S3 driver is written but unexercised. `src/lib/screen.ts` is a pass-through: wire a
real content screener up before running an actual wedding.

## The three decisions everything else follows from

1. **Darkroom mode** — `Frame.developsAt` is a column, not a job, so the feed is a
   plain query. A photo becomes visible ~25 minutes after it is taken, which is what
   lets no-preview photography and a live social layer coexist.
2. **Film is the only currency** — challenges and reactions pay out in exposures,
   never points, and a challenge never costs an extra shot.
3. **Style is a presentation layer** — originals are never modified. The look is
   applied at display and baked only at export, so a couple can re-develop their
   whole wedding in a different camera later.

A fourth, enforced in `src/app/api/media/[...key]/route.ts`: **no preview means no
preview**, including for the photographer. Fetching your own undeveloped frame by
its direct URL returns 403. Without that the mechanic would be theatre.

## Layout

```
prisma/schema.prisma          the data model
src/lib/night.ts              phases, develop timing, reveal chapters
src/lib/queue.ts              the IndexedDB outbox — capture and delivery are separate
src/lib/styles.ts             the six cameras
src/lib/challenges.ts         the challenge packs, Hebrew as the original
src/components/guest/         the camera, darkroom, quests, roll
src/components/screen/        the projector
src/components/studio/        the printed Camera Pass
design/                       the product design and the original prototype
```

## Design

The full product and experience design — including the MVP cut, pricing, risks, and
where the original brief needed changing — lives in `design/strategy.html`, with a
clickable prototype in `design/prototype.html`.
