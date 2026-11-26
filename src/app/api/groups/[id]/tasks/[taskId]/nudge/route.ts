import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupMembership } from "@/lib/api-auth";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id: groupId, taskId } = await context.params;
  const check = await requireGroupMembership(groupId, auth.user.id);
  if (check.error) return check.error;

  const task = await prisma.groupTask.findUnique({ where: { id: taskId } });
  if (!task || task.groupId !== groupId) {
    return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
  }

  await prisma.notification.create({
    data: {
      userId: task.assigneeId,
      message: `${auth.user.name} mengingatkan tugas "${task.title}" di ${check.membership.group.name}.`,
      type: "nudge",
    },
  });

  return NextResponse.json({ ok: true });
}
