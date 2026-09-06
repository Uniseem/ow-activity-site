import { prisma } from "@/lib/prisma";
import { isD1Database } from "@/lib/database-provider";
import { reviewD1Profile } from "@/lib/d1-atomic";

export async function applyProfileReview(input: {
  profileId: string;
  decision: "APPROVED" | "REJECTED";
  note: string | null;
  reviewerId: string | null;
}) {
  if (isD1Database()) {
    await reviewD1Profile(
      input.profileId,
      input.decision,
      input.note,
      input.reviewerId,
    );
    return;
  }
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
