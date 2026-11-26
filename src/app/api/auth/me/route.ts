import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export async function GET() {
  await ensureDemoData();
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
