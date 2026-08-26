import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ModConsole } from "@/components/mod/ModConsole";

export const dynamic = "force-dynamic";

export default async function ModPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { modToken: token },
    select: { coupleNames: true },
  });
  if (!wedding) notFound();

  return <ModConsole token={token} coupleNames={wedding.coupleNames} />;
}
