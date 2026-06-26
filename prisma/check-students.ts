import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const students = await prisma.studentProfile.findMany({
    orderBy: {
      fullName: "asc",
    },
    select: {
      controlNumber: true,
      fullName: true,
      group: true,
      user: {
        select: {
          isActive: true,
          role: true,
        },
      },
    },
  });

  console.table(students.map((student) => ({
    controlNumber: student.controlNumber,
    fullName: student.fullName,
    group: student.group,
    active: student.user.isActive,
    role: student.user.role,
  })));

  console.log("");
  console.log(`Total de alumnos: ${students.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
