import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";
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

const students = [
  {
    controlNumber: "22460261",
    fullName: "ANGUIANO TIRADO MARIANA ALEJANDRA",
    group: "Verano IA",
  },
  {
    controlNumber: "21460490",
    fullName: "BASURTO SANDOVAL ESDRAS JOSUE",
    group: "Verano IA",
  },
  {
    controlNumber: "22460270",
    fullName: "CASTELLANOS DEL TORO KARIM",
    group: "Verano IA",
  },
  {
    controlNumber: "21460434",
    fullName: "CASTILLON RAMIREZ SEBASTIAN ALEJANDRO",
    group: "Verano IA",
  },
  {
    controlNumber: "21460155",
    fullName: "CEDILLO SOLARES FRANCISCO JAVIER",
    group: "Verano IA",
  },
  {
    controlNumber: "22460277",
    fullName: "CORTES CONTRERAS ADAN",
    group: "Verano IA",
  },
  {
    controlNumber: "22460280",
    fullName: "DOLORES ORTEGA RAUL HUMBERTO",
    group: "Verano IA",
  },
  {
    controlNumber: "22460282",
    fullName: "EUSEBIO GARCIA BRANDON YAHIR",
    group: "Verano IA",
  },
  {
    controlNumber: "21460442",
    fullName: "FLORES PRECIADO JESUS",
    group: "Verano IA",
  },
  {
    controlNumber: "21460198",
    fullName: "GAITAN JIMENEZ EUGENIO",
    group: "Verano IA",
  },
  {
    controlNumber: "21460591",
    fullName: "GOMEZ BRAMBILA LUIS ENRIQUE",
    group: "Verano IA",
  },
  {
    controlNumber: "21460158",
    fullName: "GONZALEZ MEJIA DIEGO YAEL",
    group: "Verano IA",
  },
  {
    controlNumber: "21460054",
    fullName: "GONZALEZ RALLAS ERICK RUBEN",
    group: "Verano IA",
  },
  {
    controlNumber: "22460293",
    fullName: "GUTIERREZ SUAREZ AMANDA GUADALUPE",
    group: "Verano IA",
  },
  {
    controlNumber: "21460488",
    fullName: "IBAÑEZ RAMIREZ EMMANUEL ALEXANDER",
    group: "Verano IA",
  },
  {
    controlNumber: "C21460530",
    fullName: "MAGAÑA RAMIREZ SALVADOR",
    group: "Verano IA",
  },
  {
    controlNumber: "21460681",
    fullName: "MAZA RIVERA DANIEL SANTIAGO",
    group: "Verano IA",
  },
  {
    controlNumber: "22460317",
    fullName: "MURGUIA GALAN CRISTIAN EMMANUEL",
    group: "Verano IA",
  },
  {
    controlNumber: "22460322",
    fullName: "POLANCO BARAJAS IVAN EDUARDO",
    group: "Verano IA",
  },
  {
    controlNumber: "22460342",
    fullName: "VALENCIA GONZALEZ LUIS RAMON",
    group: "Verano IA",
  },
];

async function main() {
  console.log("🌱 Cargando alumnos reales...");

  for (const student of students) {
    const passwordHash = await bcrypt.hash(student.controlNumber, 10);

    const existingProfile = await prisma.studentProfile.findUnique({
      where: {
        controlNumber: student.controlNumber,
      },
      include: {
        user: true,
      },
    });

    if (existingProfile) {
      await prisma.user.update({
        where: {
          id: existingProfile.userId,
        },
        data: {
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
        },
      });

      await prisma.studentProfile.update({
        where: {
          id: existingProfile.id,
        },
        data: {
          fullName: student.fullName,
          group: student.group,
        },
      });

      console.log(`✅ Actualizado: ${student.controlNumber} - ${student.fullName}`);
    } else {
      await prisma.user.create({
        data: {
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
          studentProfile: {
            create: {
              controlNumber: student.controlNumber,
              fullName: student.fullName,
              group: student.group,
            },
          },
        },
      });

      console.log(`✅ Creado: ${student.controlNumber} - ${student.fullName}`);
    }
  }

  console.log("");
  console.log("🎉 Alumnos cargados correctamente");
  console.log("");
  console.log("Regla de acceso:");
  console.log("Usuario: No. de control");
  console.log("Contraseña inicial: No. de control");
}

main()
  .catch((error) => {
    console.error("❌ Error cargando alumnos");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
