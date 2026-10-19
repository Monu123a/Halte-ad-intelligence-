import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tag, adSetId } = body;
  
  const dataToUpdate: any = {};

  if (tag !== undefined) {
    const validTags = ["UNTAGGED", "SPAM", "INFO_ONLY", "GENUINE", "CONVERTED", "QUOTATION_SENT"];
    if (!validTags.includes(tag)) {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }
    dataToUpdate.tag = tag;
    dataToUpdate.taggedBy = session.id;
    dataToUpdate.taggedAt = new Date();
  }

  if (adSetId !== undefined) {
    dataToUpdate.adSetId = adSetId || null;
  }

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: dataToUpdate,
    include: {
      adSet: {
        select: {
          id: true,
          name: true,
          campaign: {
            select: {
              brand: {
                select: { name: true }
              }
            }
          }
        }
      }
    }
  });

  try {
    const { invalidateServicesCache } = await import("@/lib/services");
    invalidateServicesCache();
  } catch {}

  return NextResponse.json({ lead });

}
