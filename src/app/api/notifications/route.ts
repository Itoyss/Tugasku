import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  await prisma.notification.updateMany({
    where: { userId: auth.user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
