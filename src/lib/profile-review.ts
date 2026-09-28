import { prisma } from "@/lib/prisma";

export async function applyProfileReview(input: {
  profileId: string;
  decision: "APPROVED" | "REJECTED";
  note: string | null;
  reviewerId: string | null;
}) {
  await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.update({
      where: { id: input.profileId },
      data: {
        reviewStatus: input.decision,
        reviewNote: input.note,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
      },
      select: {
        userId: true,
        user: { select: { role: true } },
      },
    });
    if (profile.user.role === "ADMIN") return;
    await tx.user.update({
      where: { id: profile.userId },
      data: { status: input.decision },
    });
  });
}
