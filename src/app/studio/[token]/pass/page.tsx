import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { CameraPass } from "@/components/studio/CameraPass";

export const dynamic = "force-dynamic";

/**
 * The print kit.
 *
 * The card on the table is the most-seen object the brand owns — 350 people, at
 * eye level, for five hours — and it is the only part of the product a guest
 * meets before deciding whether to take part. It never explains the product.
 *
 * The MC script on this page matters more than the card: one sentence from the
 * person the room is already listening to is worth more than every other
 * adoption lever combined.
 */
export default async function PassPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const wedding = await prisma.wedding.findUnique({
    where: { studioToken: token },
    select: {
      slug: true,
      coupleNames: true,
      weddingDate: true,
      exposures: true,
      revealAt: true,
    },
  });
  if (!wedding) notFound();

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/w/${wedding.slug}`;

  // Rendered server-side as an inline SVG so printing never waits on a network
  // request and the card can't come out of the printer with a hole in it.
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#12100e", light: "#f5efe7" },
  });

  return (
    <CameraPass
      qrSvg={qr}
      url={url}
      coupleNames={wedding.coupleNames}
      weddingDate={wedding.weddingDate.toISOString()}
      exposures={wedding.exposures}
      revealAt={wedding.revealAt.toISOString()}
    />
  );
}
