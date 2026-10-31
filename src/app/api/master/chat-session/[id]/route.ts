import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden: Master authority required" }, { status: 403 });
  }

  try {
    await prisma.aIChatSession.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Master Delete Session Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete session" }, { status: 500 });
  }
}
