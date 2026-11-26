import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    await ensureDemoData();
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    await setSessionCookie(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal login." }, { status: 500 });
  }
}
