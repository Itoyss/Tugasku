import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireGroupMembership } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/helpers";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const check = await requireGroupMembership(id, auth.user.id);
  if (check.error) return check.error;

  if (check.membership.group.ownerId !== auth.user.id) {
    return NextResponse.json(
      { error: "Hanya pembuat kelompok yang bisa mengatur akses grup." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { isLocked?: boolean; resetCode?: boolean };
  let newCode: string | undefined;
  if (body.resetCode) {
    newCode = generateInviteCode();
  }

  const updated = await prisma.group.update({
    where: { id },
    data: {
      ...(body.isLocked !== undefined ? { isLocked: Boolean(body.isLocked) } : {}),
      ...(newCode ? { inviteCode: newCode } : {}),
    },
  });

  return NextResponse.json({ group: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const check = await requireGroupMembership(id, auth.user.id);
  if (check.error) return check.error;

  if (check.membership.group.ownerId !== auth.user.id) {
    return NextResponse.json(
      { error: "Hanya pembuat kelompok yang bisa menghapus grup." },
      { status: 403 }
    );
  }

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
