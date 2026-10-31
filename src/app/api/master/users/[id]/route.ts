import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden: Master authority required" }, { status: 403 });
  }

  try {
    const { role, newPassword } = await req.json();
    const updateData: any = {};

    if (role && ["MASTER", "ADMIN", "ANALYST", "LEAD_TAGGER"].includes(role)) {
      updateData.role = role;
    }

    if (newPassword && newPassword.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, email: true, role: true, createdAt: true }
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("[Master Update User Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden: Master authority required" }, { status: 403 });
  }

  if (session.id === params.id) {
    return NextResponse.json({ error: "Cannot delete the active Master account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Master Delete User Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
