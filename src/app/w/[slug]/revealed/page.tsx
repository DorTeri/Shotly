import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/guest/Reveal";

export const dynamic = "force-dynamic";

export default async function RevealedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { slug },
    select: { coupleNames: true },
  });
  if (!wedding) notFound();

  return <Reveal slug={slug} />;
}
