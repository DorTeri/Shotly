import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Studio } from "@/components/studio/Studio";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { studioToken: token },
    select: { coupleNames: true },
  });
  return { title: wedding ? `${wedding.coupleNames} · Shotly` : "Shotly" };
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { studioToken: token },
    select: { id: true },
  });
  if (!wedding) notFound();

  return <Studio token={token} />;
}
