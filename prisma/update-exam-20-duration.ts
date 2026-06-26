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
  const title = "Evaluación Integral de Inteligencia Artificial - 20 preguntas";

  const exam = await prisma.exam.updateMany({
    where: {
      title,
    },
    data: {
      durationMinutes: 50,
    },
  });

  if (exam.count === 0) {
    console.log("⚠️ No se encontró el examen:", title);
    return;
  }

  console.log("✅ Duración actualizada a 50 minutos:", title);
}

main()
  .catch((error) => {
    console.error("❌ Error actualizando duración:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
