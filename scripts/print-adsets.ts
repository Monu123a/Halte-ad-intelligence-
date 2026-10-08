import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.adSet.findMany({ select: { name: true } }).then(res => console.log(res.map(r => r.name))).finally(() => prisma.$disconnect());
