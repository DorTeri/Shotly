import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VenueScreen } from "@/components/screen/VenueScreen";

export const dynamic = "force-dynamic";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { slug },
    select: { coupleNames: true, screenEnabled: true },
  });
  if (!wedding) notFound();

  if (!wedding.screenEnabled) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-ink px-8 text-center">
        <p className="text-[18px] text-paper-2">
          המסך כבוי עבור החתונה הזאת.
        </p>
      </main>
    );
  }

  return <VenueScreen slug={slug} />;
}
