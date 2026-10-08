import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tag } = await req.json();
  
  const validTags = ["UNTAGGED", "SPAM", "INFO_ONLY", "GENUINE", "CONVERTED", "QUOTATION_SENT"];
  if (!validTags.includes(tag)) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      tag,
      taggedBy: session.id,
      taggedAt: new Date(),
    }
  });

  return NextResponse.json({ lead });
}
