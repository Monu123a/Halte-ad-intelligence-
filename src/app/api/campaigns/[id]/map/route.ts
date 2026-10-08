import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

  const body = await req.json();
  const { brandPageId, products } = body;

  if (!brandPageId) return new NextResponse("Missing brandPageId", { status: 400 });

  await prisma.campaign.update({
    where: { id: params.id },
    data: { 
      brandPageId,
      products: products || []
    }
  });

  return NextResponse.json({ success: true });
}
