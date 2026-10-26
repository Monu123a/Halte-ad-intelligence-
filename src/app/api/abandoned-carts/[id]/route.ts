import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const { id } = params;
    const body = await request.json();

    const { status, recoveryNotes, remark } = body;

    const existing = await prisma.abandonedCart.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status && ["ABANDONED", "CONTACTED", "RECOVERED", "LOST"].includes(status)) {
      updateData.status = status;
      if (status === "CONTACTED" || status === "RECOVERED") {
        updateData.lastContactedAt = new Date();
        updateData.contactedBy = session?.email || "staff@halte.in";
      }
    }

    if (typeof recoveryNotes === "string") {
      updateData.recoveryNotes = recoveryNotes;
    }

    if (typeof remark === "string" && remark.trim()) {
      const currentRemarks = Array.isArray(existing.remarks) ? (existing.remarks as any[]) : [];
      const newRemark = {
        id: Date.now(),
        remark: remark.trim(),
        added_by: session?.email || "Staff",
        created_at: new Date().toISOString(),
      };
      updateData.remarks = [newRemark, ...currentRemarks];
    }

    const updated = await prisma.abandonedCart.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, cart: updated });
  } catch (err: any) {
    console.error("Error updating abandoned cart:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
