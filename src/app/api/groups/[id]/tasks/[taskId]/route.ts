import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupMembership } from "@/lib/api-auth";
import { dateFromPresetOrIso } from "@/lib/helpers";

const VALID_STATUSES = new Set(["todo", "doing", "done"]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id: groupId, taskId } = await context.params;
  const check = await requireGroupMembership(groupId, auth.user.id);
  if (check.error) return check.error;

  const existing = await prisma.groupTask.findUnique({ where: { id: taskId } });
  if (!existing || existing.groupId !== groupId) {
    return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
  }

  const body = (await req.json()) as {
    status?: string;
    proofText?: string;
    title?: string;
    assigneeId?: string;
    dueDate?: string;
  };

  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  const nextStatus = body.status ?? existing.status;
  const nextProof =
    body.proofText !== undefined ? body.proofText.trim() : existing.proofText?.trim() || "";

  if (nextStatus === "done" && !nextProof) {
    return NextResponse.json(
      { error: "Wajib lampirkan link atau catatan bukti sebelum menandai selesai." },
      { status: 400 }
    );
  }

  const updated = await prisma.groupTask.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      ...(body.proofText !== undefined ? { proofText: nextProof || null } : {}),
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
      ...(body.dueDate !== undefined ? { dueDate: dateFromPresetOrIso(body.dueDate) } : {}),
      completedAt: nextStatus === "done" ? existing.completedAt ?? new Date() : null,
    },
    include: {
      assignee: {
        select: { id: true, name: true, avatarColor: true },
      },
    },
  });

  // Notify teammates when a task transitions to done
  if (existing.status !== "done" && nextStatus === "done") {
    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: auth.user.id } },
      select: { userId: true },
    });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          message: `${auth.user.name} menyelesaikan "${updated.title}" di ${check.membership.group.name}.`,
          type: "done",
        })),
      });
    }
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id: groupId, taskId } = await context.params;
  const check = await requireGroupMembership(groupId, auth.user.id);
  if (check.error) return check.error;

  const existing = await prisma.groupTask.findUnique({ where: { id: taskId } });
  if (!existing || existing.groupId !== groupId) {
    return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
  }

  await prisma.groupTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
