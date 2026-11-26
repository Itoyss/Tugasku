import { NextResponse } from "next/server";
import { getCurrentUser, SafeUser } from "./auth";
import { prisma } from "./prisma";

export async function requireApiUser(): Promise<
  { user: SafeUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireGroupMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId },
    },
    include: {
      group: true,
    },
  });
  if (!membership) {
    return {
      error: NextResponse.json({ error: "Kamu bukan anggota kelompok ini." }, { status: 403 }),
    };
  }
  return { membership };
}
