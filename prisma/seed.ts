import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaClient, ExamStatus, QuestionType, UserRole } from "@prisma/client";
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
  console.log("🌱 Iniciando seed...");

  const teacherPasswordHash = await bcrypt.hash("Admin12345", 10);
  const studentPasswordHash = await bcrypt.hash("Alumno12345", 10);

  const teacherUser = await prisma.user.upsert({
    where: {
      email: "docente@emcode.tech",
    },
    update: {
      passwordHash: teacherPasswordHash,
      isActive: true,
      role: UserRole.TEACHER,
    },
    create: {
      email: "docente@emcode.tech",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      teacherProfile: {
        create: {
          fullName: "José Efrén De La Mora Osorio",
        },
      },
    },
    include: {
      teacherProfile: true,
    },
  });

  console.log("✅ Docente creado/actualizado:", teacherUser.email);

  const students = [
    {
      controlNumber: "23100001",
      fullName: "Alumno Demo Uno",
      group: "Verano IA",
    },
    {
      controlNumber: "23100002",
      fullName: "Alumno Demo Dos",
      group: "Verano IA",
    },
    {
      controlNumber: "23100003",
      fullName: "Alumno Demo Tres",
      group: "Verano IA",
    },
  ];

  for (const student of students) {
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
          passwordHash: studentPasswordHash,
          isActive: true,
          role: UserRole.STUDENT,
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

      console.log("✅ Alumno actualizado:", student.controlNumber);
    } else {
      await prisma.user.create({
        data: {
          role: UserRole.STUDENT,
          passwordHash: studentPasswordHash,
          studentProfile: {
            create: {
              controlNumber: student.controlNumber,
              fullName: student.fullName,
              group: student.group,
            },
          },
        },
      });

      console.log("✅ Alumno creado:", student.controlNumber);
    }
  }

  const existingExam = await prisma.exam.findFirst({
    where: {
      title: "Evaluación Diagnóstica IA - Clases 1 a 4",
    },
  });

  if (existingExam) {
    await prisma.answer.deleteMany({
      where: {
        question: {
          examId: existingExam.id,
        },
      },
    });

    await prisma.examAttempt.deleteMany({
      where: {
        examId: existingExam.id,
      },
    });

    await prisma.question.deleteMany({
      where: {
        examId: existingExam.id,
      },
    });

    await prisma.exam.delete({
      where: {
        id: existingExam.id,
      },
    });

    console.log("♻️ Examen anterior eliminado para recrearlo limpio");
  }

  const exam = await prisma.exam.create({
    data: {
      title: "Evaluación Diagnóstica IA - Clases 1 a 4",
      description:
        "Evaluación sobre fundamentos de Inteligencia Artificial, agentes inteligentes, búsqueda en espacios de estado y aplicaciones actuales de IA.",
      status: ExamStatus.PUBLISHED,
      accessCode: "IA2026",
      durationMinutes: 90,
      oneAttemptOnly: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultToStudent: true,
      showCorrectAnswersToStudent: false,
      createdById: teacherUser.id,
    },
  });

  console.log("✅ Examen creado:", exam.title);

  const questions = [
    {
      section: "Fundamentos de IA",
      topic: "Concepto de Inteligencia Artificial",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Cuál es la mejor definición de Inteligencia Artificial?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          {
            id: "a",
            text: "Un programa que siempre responde correctamente.",
          },
          {
            id: "b",
            text: "Un sistema capaz de percibir, razonar, aprender o tomar decisiones para resolver problemas.",
          },
          {
            id: "c",
            text: "Una computadora con acceso a internet.",
          },
          {
            id: "d",
            text: "Una aplicación que solo genera imágenes.",
          },
        ],
      },
      correctAnswerJson: {
        value: "b",
      },
      points: 5,
      order: 1,
      difficulty: "Básica",
    },
    {
      section: "Fundamentos de IA",
      topic: "Tipos de IA",
      type: QuestionType.TRUE_FALSE,
      prompt:
        "La IA débil se especializa en tareas concretas, mientras que la IA fuerte tendría una inteligencia general comparable a la humana.",
      instructions: "Indica si la afirmación es verdadera o falsa.",
      optionsJson: {
        options: [
          {
            id: "true",
            text: "Verdadero",
          },
          {
            id: "false",
            text: "Falso",
          },
        ],
      },
      correctAnswerJson: {
        value: true,
      },
      points: 5,
      order: 2,
      difficulty: "Básica",
    },
    {
      section: "Agentes inteligentes",
      topic: "Modelo PEAS",
      type: QuestionType.MULTIPLE_SELECT,
      prompt:
        "Selecciona los elementos que forman parte del modelo PEAS para analizar un agente inteligente.",
      instructions: "Selecciona todas las opciones correctas.",
      optionsJson: {
        options: [
          {
            id: "performance",
            text: "Medida de desempeño",
          },
          {
            id: "environment",
            text: "Entorno",
          },
          {
            id: "actuators",
            text: "Actuadores",
          },
          {
            id: "sensors",
            text: "Sensores",
          },
          {
            id: "database",
            text: "Base de datos relacional",
          },
        ],
      },
      correctAnswerJson: {
        values: ["performance", "environment", "actuators", "sensors"],
      },
      points: 10,
      order: 3,
      difficulty: "Media",
    },
    {
      section: "Búsqueda en espacios de estado",
      topic: "BFS y DFS",
      type: QuestionType.MATCHING,
      prompt: "Relaciona cada algoritmo con su característica principal.",
      instructions: "Relaciona correctamente las columnas.",
      optionsJson: {
        left: [
          {
            id: "bfs",
            text: "BFS",
          },
          {
            id: "dfs",
            text: "DFS",
          },
        ],
        right: [
          {
            id: "levels",
            text: "Explora por niveles y puede encontrar la ruta más corta si los costos son iguales.",
          },
          {
            id: "deep",
            text: "Explora una rama en profundidad antes de retroceder.",
          },
        ],
      },
      correctAnswerJson: {
        pairs: {
          bfs: "levels",
          dfs: "deep",
        },
      },
      points: 10,
      order: 4,
      difficulty: "Media",
    },
    {
      section: "Aplicaciones de IA",
      topic: "Selección de técnica de IA",
      type: QuestionType.ORDERING,
      prompt:
        "Ordena correctamente el proceso para diseñar una solución de Inteligencia Artificial.",
      instructions: "Ordena los pasos desde el inicio hasta la evaluación.",
      optionsJson: {
        options: [
          {
            id: "problem",
            text: "Definir el problema",
          },
          {
            id: "data",
            text: "Identificar los datos disponibles",
          },
          {
            id: "technique",
            text: "Elegir el área o técnica de IA adecuada",
          },
          {
            id: "output",
            text: "Definir la salida esperada",
          },
          {
            id: "evaluation",
            text: "Evaluar resultados y riesgos",
          },
        ],
      },
      correctAnswerJson: {
        order: ["problem", "data", "technique", "output", "evaluation"],
      },
      points: 10,
      order: 5,
      difficulty: "Media",
    },
    {
      section: "Machine Learning",
      topic: "ML y redes neuronales",
      type: QuestionType.OPEN_TEXT,
      prompt:
        "Explica la diferencia entre Machine Learning y Redes Neuronales. Incluye un ejemplo.",
      instructions:
        "Responde con tus propias palabras. Se evaluará claridad conceptual, relación entre los conceptos y ejemplo.",
      optionsJson: null,
      correctAnswerJson: null,
      rubricJson: {
        criteria: [
          {
            name: "Define Machine Learning",
            points: 3,
            expected:
              "Explica que Machine Learning aprende patrones a partir de datos o ejemplos.",
          },
          {
            name: "Define red neuronal",
            points: 3,
            expected:
              "Explica que una red neuronal es una técnica o modelo dentro del aprendizaje automático.",
          },
          {
            name: "Relaciona IA, ML y redes neuronales",
            points: 2,
            expected:
              "Identifica que IA es el campo amplio, ML es una subárea y redes neuronales son una técnica dentro de ML.",
          },
          {
            name: "Ejemplo correcto",
            points: 2,
            expected:
              "Incluye un ejemplo coherente, como clasificar imágenes, predecir riesgo académico o detectar spam.",
          },
        ],
      },
      points: 10,
      order: 6,
      difficulty: "Media",
    },
    {
      section: "Análisis de caso",
      topic: "Diseño de solución IA",
      type: QuestionType.CASE_ANALYSIS,
      prompt:
        "Una escuela quiere detectar alumnos con riesgo de reprobar antes de finalizar el semestre. Tiene datos de asistencia, tareas entregadas, calificaciones parciales y participación. ¿Qué tipo de solución de IA propondrías y por qué?",
      instructions:
        "Incluye problema, datos de entrada, técnica recomendada, salida esperada, acción sugerida y un riesgo ético o técnico.",
      optionsJson: null,
      correctAnswerJson: null,
      rubricJson: {
        criteria: [
          {
            name: "Identificación del problema",
            points: 2,
            expected:
              "Reconoce que el problema es detectar o predecir riesgo académico.",
          },
          {
            name: "Datos de entrada",
            points: 2,
            expected:
              "Menciona asistencia, tareas, calificaciones, participación u otros datos escolares relevantes.",
          },
          {
            name: "Técnica de IA recomendada",
            points: 2,
            expected:
              "Propone aprendizaje supervisado, clasificación, Machine Learning o red neuronal de forma justificada.",
          },
          {
            name: "Salida esperada y acción",
            points: 2,
            expected:
              "Define una salida como riesgo bajo/medio/alto y una acción como tutoría, alerta o seguimiento.",
          },
          {
            name: "Riesgo ético o técnico",
            points: 2,
            expected:
              "Menciona privacidad, sesgo, datos incompletos, falsa predicción o uso incorrecto del resultado.",
          },
        ],
      },
      points: 10,
      order: 7,
      difficulty: "Alta",
    },
  ];

  for (const question of questions) {
    await prisma.question.create({
      data: {
        examId: exam.id,
        ...question,
      },
    });
  }

  console.log("✅ Preguntas creadas:", questions.length);

  await prisma.auditLog.create({
    data: {
      actorId: teacherUser.id,
      action: "SEED_INITIAL_DATA",
      entity: "SYSTEM",
      entityId: null,
      metadataJson: {
        examTitle: exam.title,
        students: students.length,
        questions: questions.length,
      },
    },
  });

  console.log("");
  console.log("🎉 Seed completado correctamente");
  console.log("");
  console.log("Credenciales docente:");
  console.log("  email: docente@emcode.tech");
  console.log("  password: Admin12345");
  console.log("");
  console.log("Credenciales alumnos:");
  console.log("  No. Control: 23100001 / password: Alumno12345");
  console.log("  No. Control: 23100002 / password: Alumno12345");
  console.log("  No. Control: 23100003 / password: Alumno12345");
  console.log("");
  console.log("Código de examen:");
  console.log("  IA2026");
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
