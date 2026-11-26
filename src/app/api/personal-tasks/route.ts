import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";
import { dateFromPresetOrIso } from "@/lib/helpers";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const tasks = await prisma.personalTask.findMany({
    where: { userId: auth.user.id },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as {
      title?: string;
      course?: string;
      dueDate?: string;
      remindEnabled?: boolean;
    };

    const title = body.title?.trim() || "";
    if (!title) {
      return NextResponse.json({ error: "Judul tugas wajib diisi." }, { status: 400 });
    }

    const task = await prisma.personalTask.create({
      data: {
        userId: auth.user.id,
        title,
        course: body.course?.trim() || "Umum",
        dueDate: dateFromPresetOrIso(body.dueDate || "tomorrow"),
        remindEnabled: body.remindEnabled ?? true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah tugas mandiri." }, { status: 500 });
  }
}
