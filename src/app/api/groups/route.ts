import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/helpers";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: auth.user.id },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarColor: true,
                },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  avatarColor: true,
                },
              },
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m) => ({
    ...m.group,
    myRole: m.role,
  }));

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { name?: string; course?: string };
    const name = body.name?.trim() || "";
    const course = body.course?.trim() || "";

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Nama kelompok/project minimal 2 karakter." },
        { status: 400 }
      );
    }

    let inviteCode = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.group.findUnique({ where: { inviteCode } });
      if (!exists) break;
      inviteCode = generateInviteCode();
    }

    const group = await prisma.group.create({
      data: {
        name,
        course,
        inviteCode,
        ownerId: auth.user.id,
        members: {
          create: {
            userId: auth.user.id,
            role: "owner",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarColor: true },
            },
          },
        },
        tasks: true,
      },
    });

    return NextResponse.json({ group: { ...group, myRole: "owner" } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat kelompok." }, { status: 500 });
  }
}
