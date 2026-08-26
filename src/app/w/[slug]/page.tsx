import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { nightState } from "@/lib/night";
import { GuestShell } from "@/components/guest/GuestShell";
import type { GuestState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { slug },
    select: { coupleNames: true, exposures: true },
  });
  if (!wedding) return { title: "Shotly" };
  return {
    title: `${wedding.coupleNames} · Shotly`,
    description: `יש לך ${wedding.exposures} צילומים. אל תבזבז אותם.`,
  };
}

export default async function CameraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) notFound();

  const guest = await currentGuest(slug);
  const now = new Date();
  const night = nightState(wedding, now);

  // Once the wedding has developed, the camera is not what anyone came for.
  if (night.revealed) redirect(`/w/${slug}/revealed`);

  const [developed, guests, developing] = await Promise.all([
    prisma.frame.count({
      where: {
        weddingId: wedding.id,
        visibility: "PUBLIC",
        state: "OK",
        developsAt: { lte: now },
      },
    }),
    prisma.guest.count({ where: { weddingId: wedding.id } }),
    guest
      ? prisma.frame.count({ where: { guestId: guest.id, developsAt: { gt: now } } })
      : Promise.resolve(0),
  ]);

  // Serialised through JSON so the client sees the same shape the /state route
  // returns — one type, one contract, no drift between first paint and refresh.
  const initial: GuestState = JSON.parse(
    JSON.stringify({
      wedding: {
        slug: wedding.slug,
        coupleNames: wedding.coupleNames,
        style: wedding.style,
        cameraMode: wedding.cameraMode,
        developDelayMinutes: wedding.developDelayMinutes,
        voiceNotes: wedding.voiceNotes,
        leaderboard: wedding.leaderboard,
        weddingDate: wedding.weddingDate,
      },
      night,
      guest: guest
        ? {
            id: guest.id,
            displayName: guest.displayName,
            tableNumber: guest.tableNumber,
            exposuresTotal: guest.exposuresTotal,
            exposuresUsed: guest.exposuresUsed,
            left: guest.exposuresTotal - guest.exposuresUsed,
            hasContact: !!guest.contact,
          }
        : null,
      counts: { developed, guests, developing },
    }),
  );

  return <GuestShell slug={slug} initial={initial} exposures={wedding.exposures} />;
}
