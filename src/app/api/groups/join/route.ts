import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { inviteCode?: string };
    const rawCode = body.inviteCode?.trim().toUpperCase().replace(/^#/, "") || "";

    if (!rawCode) {
      return NextResponse.json({ error: "Masukkan kode undangan kelompok." }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: rawCode },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Kode kelompok tidak ditemukan." },
        { status: 404 }
      );
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: auth.user.id } },
    });

    if (existingMember) {
      return NextResponse.json({ groupId: group.id, alreadyMember: true });
    }

    if (group.isLocked) {
      return NextResponse.json(
        { error: "Grup ini sedang dikunci oleh ketua kelompok." },
        { status: 403 }
      );
    }

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: auth.user.id,
        role: "member",
      },
    });

    await prisma.notification.create({
      data: {
        userId: group.ownerId,
        message: `${auth.user.name} baru saja bergabung ke kelompok "${group.name}".`,
        type: "info",
      },
    });

    return NextResponse.json({ groupId: group.id, alreadyMember: false });
  } catch {
    return NextResponse.json({ error: "Gagal bergabung ke kelompok." }, { status: 500 });
  }
}
