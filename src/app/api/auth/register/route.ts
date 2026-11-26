import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { AVATAR_COLOR_OPTIONS } from "@/lib/helpers";
import { ensureDemoData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    await ensureDemoData();
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (name.length < 2) {
      return NextResponse.json({ error: "Nama minimal 2 karakter." }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const color =
      AVATAR_COLOR_OPTIONS[Math.floor(Math.random() * AVATAR_COLOR_OPTIONS.length)];

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        avatarColor: color,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
      },
    });

    await setSessionCookie(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mendaftar akun." }, { status: 500 });
  }
}
