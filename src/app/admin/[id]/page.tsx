import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { nightState } from "@/lib/night";
import { weddingLinks } from "@/lib/weddings";
import { baseUrl } from "@/lib/baseUrl";
import { cameraStyle } from "@/lib/styles";
import { WeddingHandover } from "@/components/admin/WeddingHandover";

export const dynamic = "force-dynamic";

export default async function AdminWedding({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;

  const wedding = await prisma.wedding.findUnique({
    where: { id },
    include: {
      _count: { select: { guests: true, frames: true, challenges: true, voiceNotes_: true } },
    },
  });
  if (!wedding) notFound();

  const links = weddingLinks(wedding, await baseUrl());
  const now = new Date();
  const night = nightState(wedding, now);

  const [developed, secrets] = await Promise.all([
    prisma.frame.count({
      where: { weddingId: id, visibility: "PUBLIC", state: "OK", developsAt: { lte: now } },
    }),
    prisma.frame.count({ where: { weddingId: id, visibility: "SECRET" } }),
  ]);

  // Big and forgiving: this gets scanned in low light by a phone held at arm's length.
  const qrSvg = await QRCode.toString(links.camera, {
    type: "svg",
    margin: 0,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0808", light: "#f3ede7" },
  });
  const qrPng = await QRCode.toDataURL(links.camera, {
    margin: 1,
    width: 1200,
    errorCorrectionLevel: "M",
    color: { dark: "#12100e", light: "#f5efe7" },
  });

  return (
    <main className="min-h-[100dvh] bg-ink px-6 py-10" dir="ltr">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-[13px] text-paper-3 hover:text-paper">
          ← All weddings
        </Link>

        <h1 className="mt-4 font-display text-[30px] font-extrabold tracking-tight">
          {wedding.coupleNames}
        </h1>
        <p className="tabular mt-1 text-[14px] text-paper-3">
          {wedding.weddingDate.toLocaleString("en-GB")} · {cameraStyle(wedding.style).nameEn} ·{" "}
          {wedding.exposures} EXP · {wedding.cameraMode}
        </p>

        <WeddingHandover
          id={wedding.id}
          slug={wedding.slug}
          coupleNames={wedding.coupleNames}
          links={links}
          qrSvg={qrSvg}
          qrPng={qrPng}
          phase={night.phase}
          paid={!!wedding.paidAt}
          stats={{
            guests: wedding._count.guests,
            frames: wedding._count.frames,
            developed,
            secrets,
            voices: wedding._count.voiceNotes_,
            challenges: wedding._count.challenges,
          }}
          schedule={{
            rollOpensAt: wedding.rollOpensAt.toISOString(),
            ceremonyStart: wedding.ceremonyStart?.toISOString() ?? null,
            ceremonyEnd: wedding.ceremonyEnd?.toISOString() ?? null,
            revealAt: wedding.revealAt.toISOString(),
          }}
        />
      </div>
    </main>
  );
}
