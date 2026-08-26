# Shotly

> The photographer captures the wedding. The guests capture everything else.

A mobile web camera that lives on wedding guests' phones. Fifteen shots each, no
preview, no retakes — photos develop 25 minutes later in a shared Darkroom, and the
whole wedding is revealed the next morning.

Israel-first: Hebrew guest UI, full RTL, built for 350–500 guest weddings.

## Running it

```bash
npm install
cp .env.example .env    # set ADMIN_PASSWORD
npm run db:up           # local Postgres in Docker on 5433
npm run db:migrate
npm run db:seed         # three weddings, one per state
npm run dev
```

Then open **`/admin`** and sign in with `ADMIN_PASSWORD`. You create the weddings;
couples never touch a setup flow. Creating one gives you a QR plus five links to
hand out: the guest camera, the printable Camera Pass, the venue screen, the
couple's album, and a moderator link.

The seed leaves three weddings running so every state is visible at once: one live,
one mid-ceremony (Ceremony Mode), and one from yesterday that has already developed.

**Testing on a real phone.** Leave `NEXT_PUBLIC_APP_URL` unset and links follow the
host you opened the console on — so open `http://<your-lan-ip>:3000/admin` and the
QR will be one your phone can actually scan. `localhost` QRs are unscannable.

Two environment notes on this machine: the native SWC binary is blocked by an
Application Control policy, so `dev` and `build` run `--webpack` rather than
Turbopack; and `DATABASE_URL` uses `127.0.0.1` rather than `localhost`, because on
Windows `localhost` resolves to `::1` first while Docker publishes IPv4 only.

## Where things stand

**Working end to end** — the operator console, guest camera with the no-preview
shutter, the offline upload queue, the Darkroom develop delay, reactions, challenges
paying out in film, secret frames, voice notes, the contact ask, Ceremony Mode, the
guest's contact sheet, the venue projector, the printable Camera Pass with its MC
script, guest reporting, Best Man Mode moderation, the awards, the next-day reveal,
and the couple's album with voice playback.

**Not built yet** — live missions, the leaderboard, payments, email/SMS delivery of
the reveal, download-everything, style baking at export, and personal guest albums.
The S3 driver is written but unexercised.

**Before a real wedding:** `src/lib/screen.ts` is a pass-through. No content
screening runs, which means nothing stops an explicit photo reaching the projector
except a human watching the moderator link. Wire a real screener up first.

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
src/lib/weddings.ts           the one place weddings are created (admin + seed)
src/lib/awards.ts             the seven awards, computed from reactions
src/lib/night.ts              phases, develop timing, reveal chapters
src/lib/queue.ts              the IndexedDB outbox — capture and delivery are separate
src/lib/styles.ts             the six cameras
src/lib/challenges.ts         the challenge packs, Hebrew as the original
src/components/guest/         the camera, darkroom, quests, roll
src/components/screen/        the projector
src/components/admin/         the operator console
src/components/mod/           Best Man Mode
src/components/studio/        the couple's album and the printed Camera Pass
design/                       the product design and the original prototype
```

## Design

The full product and experience design — including the MVP cut, pricing, risks, and
where the original brief needed changing — lives in `design/strategy.html`, with a
clickable prototype in `design/prototype.html`.
