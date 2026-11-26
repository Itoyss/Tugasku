import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupMembership } from "@/lib/api-auth";
import { dateFromPresetOrIso } from "@/lib/helpers";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id: groupId } = await context.params;
  const check = await requireGroupMembership(groupId, auth.user.id);
  if (check.error) return check.error;

  try {
    const body = (await req.json()) as {
      title?: string;
      assigneeId?: string;
      dueDate?: string;
    };

    const title = body.title?.trim() || "";
    const assigneeId = body.assigneeId || auth.user.id;

    if (!title) {
      return NextResponse.json({ error: "Judul tugas wajib diisi." }, { status: 400 });
    }

    const assigneeMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!assigneeMembership) {
      return NextResponse.json(
        { error: "Penanggung jawab harus anggota kelompok ini." },
        { status: 400 }
      );
    }

    const task = await prisma.groupTask.create({
      data: {
        groupId,
        title,
        assigneeId,
        createdById: auth.user.id,
        dueDate: dateFromPresetOrIso(body.dueDate || "tomorrow"),
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    });

    if (assigneeId !== auth.user.id) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          message: `${auth.user.name} menugaskan "${title}" di ${check.membership.group.name}.`,
          type: "info",
        },
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah tugas kelompok." }, { status: 500 });
  }
}
