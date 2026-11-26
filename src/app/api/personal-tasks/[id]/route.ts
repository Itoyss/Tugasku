import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";
import { dateFromPresetOrIso } from "@/lib/helpers";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await prisma.personalTask.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.user.id) {
    return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
  }

  const body = (await req.json()) as {
    title?: string;
    course?: string;
    dueDate?: string;
    done?: boolean;
    remindEnabled?: boolean;
  };

  const updated = await prisma.personalTask.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.course !== undefined ? { course: body.course.trim() || "Umum" } : {}),
      ...(body.dueDate !== undefined ? { dueDate: dateFromPresetOrIso(body.dueDate) } : {}),
      ...(body.done !== undefined ? { done: Boolean(body.done) } : {}),
      ...(body.remindEnabled !== undefined
        ? { remindEnabled: Boolean(body.remindEnabled) }
        : {}),
    },
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await prisma.personalTask.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.user.id) {
    return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
  }

  await prisma.personalTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
