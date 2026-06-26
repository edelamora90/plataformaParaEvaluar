import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const controlNumber = "99999995";
  const passwordHash = await bcrypt.hash(controlNumber, 10);

  const existing = await prisma.studentProfile.findUnique({
    where: { controlNumber },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
      },
    });

    await prisma.studentProfile.update({
      where: { id: existing.id },
      data: {
        fullName: "ALUMNO DE PRUEBA IA DEFINITIVA",
        group: "Pruebas",
      },
    });
  } else {
    await prisma.user.create({
      data: {
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
        studentProfile: {
          create: {
            controlNumber,
            fullName: "ALUMNO DE PRUEBA IA DEFINITIVA",
            group: "Pruebas",
          },
        },
      },
    });
  }

  console.log("✅ Alumno listo: 99999995 / 99999995");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
