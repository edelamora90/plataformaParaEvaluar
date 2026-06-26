import "dotenv/config";
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
  console.log("🌱 Creando examen de 20 preguntas...");

  const teacherUser = await prisma.user.findFirst({
    where: {
      role: UserRole.TEACHER,
      email: "docente@emcode.tech",
    },
  });

  if (!teacherUser) {
    throw new Error("No existe el docente docente@emcode.tech. Ejecuta primero prisma/seed.ts");
  }

  const title = "Evaluación Integral de Inteligencia Artificial - 20 preguntas";

  const existingExam = await prisma.exam.findFirst({
    where: {
      title,
    },
    include: {
      _count: {
        select: {
          attempts: true,
          questions: true,
        },
      },
    },
  });

  if (existingExam) {
    console.log("⚠️ El examen ya existe. No se modificó para no afectar intentos o evidencias.");
    console.log("Examen:", existingExam.title);
    console.log("Preguntas:", existingExam._count.questions);
    console.log("Intentos:", existingExam._count.attempts);
    return;
  }

  const exam = await prisma.exam.create({
    data: {
      title,
      description:
        "Evaluación integral sobre fundamentos de Inteligencia Artificial, agentes inteligentes, búsqueda, Machine Learning, redes neuronales, ética, sesgos, IA generativa y diseño de soluciones aplicadas.",
      status: ExamStatus.PUBLISHED,
      accessCode: "IA20",
      durationMinutes: 120,
      oneAttemptOnly: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultToStudent: true,
      showCorrectAnswersToStudent: false,
      createdById: teacherUser.id,
    },
  });

  const questions = [
    {
      section: "Fundamentos de IA",
      topic: "Concepto de Inteligencia Artificial",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Cuál de las siguientes opciones describe mejor a la Inteligencia Artificial?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "Un sistema que solo almacena grandes cantidades de información." },
          { id: "b", text: "Un sistema capaz de percibir, razonar, aprender o tomar decisiones para resolver problemas." },
          { id: "c", text: "Una computadora conectada a internet." },
          { id: "d", text: "Una base de datos con respuestas predefinidas." },
        ],
      },
      correctAnswerJson: { value: "b" },
      points: 5,
      order: 1,
      difficulty: "Básica",
    },
    {
      section: "Fundamentos de IA",
      topic: "IA débil e IA fuerte",
      type: QuestionType.TRUE_FALSE,
      prompt:
        "La IA débil está diseñada para tareas específicas, mientras que la IA fuerte implicaría una inteligencia general comparable a la humana.",
      instructions: "Indica si la afirmación es verdadera o falsa.",
      optionsJson: {
        options: [
          { id: "true", text: "Verdadero" },
          { id: "false", text: "Falso" },
        ],
      },
      correctAnswerJson: { value: true },
      points: 5,
      order: 2,
      difficulty: "Básica",
    },
    {
      section: "Fundamentos de IA",
      topic: "IA generativa",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Qué caracteriza principalmente a la IA generativa?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "Solo organiza archivos en carpetas." },
          { id: "b", text: "Crea contenido nuevo como texto, imágenes, audio, código o video a partir de patrones aprendidos." },
          { id: "c", text: "Únicamente ejecuta cálculos matemáticos simples." },
          { id: "d", text: "Solo sirve para navegar en internet." },
        ],
      },
      correctAnswerJson: { value: "b" },
      points: 5,
      order: 3,
      difficulty: "Básica",
    },
    {
      section: "Agentes inteligentes",
      topic: "Agentes y entorno",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "En Inteligencia Artificial, ¿qué es un agente inteligente?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "Un programa que no interactúa con su entorno." },
          { id: "b", text: "Una entidad que percibe su entorno mediante sensores y actúa mediante actuadores para alcanzar objetivos." },
          { id: "c", text: "Un usuario que usa ChatGPT." },
          { id: "d", text: "Un archivo con instrucciones de instalación." },
        ],
      },
      correctAnswerJson: { value: "b" },
      points: 5,
      order: 4,
      difficulty: "Básica",
    },
    {
      section: "Agentes inteligentes",
      topic: "Modelo PEAS",
      type: QuestionType.MULTIPLE_SELECT,
      prompt: "Selecciona los elementos que forman parte del modelo PEAS.",
      instructions: "Selecciona todas las opciones correctas.",
      optionsJson: {
        options: [
          { id: "performance", text: "Medida de desempeño" },
          { id: "environment", text: "Entorno" },
          { id: "actuators", text: "Actuadores" },
          { id: "sensors", text: "Sensores" },
          { id: "storage", text: "Almacenamiento permanente" },
          { id: "screen", text: "Tamaño de pantalla" },
        ],
      },
      correctAnswerJson: {
        values: ["performance", "environment", "actuators", "sensors"],
      },
      points: 10,
      order: 5,
      difficulty: "Media",
    },
    {
      section: "Agentes inteligentes",
      topic: "Tipos de agentes",
      type: QuestionType.TRUE_FALSE,
      prompt:
        "Un agente reflexivo simple toma decisiones únicamente con base en la percepción actual, sin considerar historial ni aprendizaje.",
      instructions: "Indica si la afirmación es verdadera o falsa.",
      optionsJson: {
        options: [
          { id: "true", text: "Verdadero" },
          { id: "false", text: "Falso" },
        ],
      },
      correctAnswerJson: { value: true },
      points: 5,
      order: 6,
      difficulty: "Media",
    },
    {
      section: "Búsqueda en IA",
      topic: "BFS y DFS",
      type: QuestionType.MATCHING,
      prompt: "Relaciona cada algoritmo con su característica principal.",
      instructions: "Relaciona correctamente cada concepto.",
      optionsJson: {
        left: [
          { id: "bfs", text: "BFS" },
          { id: "dfs", text: "DFS" },
          { id: "astar", text: "A*" },
        ],
        right: [
          { id: "queue", text: "Explora por niveles usando una cola." },
          { id: "stack", text: "Profundiza en una rama usando pila o recursión." },
          { id: "heuristic", text: "Usa una heurística para orientar la búsqueda." },
        ],
      },
      correctAnswerJson: {
        pairs: {
          bfs: "queue",
          dfs: "stack",
          astar: "heuristic",
        },
      },
      points: 15,
      order: 7,
      difficulty: "Media",
    },
    {
      section: "Búsqueda en IA",
      topic: "Búsqueda informada",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Qué diferencia principalmente a una búsqueda informada de una no informada?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "La búsqueda informada nunca usa datos." },
          { id: "b", text: "La búsqueda informada usa una heurística o conocimiento adicional para guiar la exploración." },
          { id: "c", text: "La búsqueda informada siempre es más lenta." },
          { id: "d", text: "La búsqueda no informada solo se usa en imágenes." },
        ],
      },
      correctAnswerJson: { value: "b" },
      points: 5,
      order: 8,
      difficulty: "Media",
    },
    {
      section: "Machine Learning",
      topic: "Aprendizaje supervisado",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Cuál es un ejemplo claro de aprendizaje supervisado?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "Agrupar clientes sin etiquetas previas." },
          { id: "b", text: "Entrenar un modelo con ejemplos de correos etiquetados como spam o no spam." },
          { id: "c", text: "Explorar un entorno mediante recompensas." },
          { id: "d", text: "Ordenar archivos alfabéticamente." },
        ],
      },
      correctAnswerJson: { value: "b" },
      points: 5,
      order: 9,
      difficulty: "Básica",
    },
    {
      section: "Machine Learning",
      topic: "Tipos de aprendizaje",
      type: QuestionType.MATCHING,
      prompt: "Relaciona cada tipo de aprendizaje con su descripción.",
      instructions: "Relaciona correctamente.",
      optionsJson: {
        left: [
          { id: "supervised", text: "Supervisado" },
          { id: "unsupervised", text: "No supervisado" },
          { id: "reinforcement", text: "Por refuerzo" },
        ],
        right: [
          { id: "labels", text: "Usa datos etiquetados." },
          { id: "patterns", text: "Busca patrones sin etiquetas previas." },
          { id: "rewards", text: "Aprende mediante recompensas o penalizaciones." },
        ],
      },
      correctAnswerJson: {
        pairs: {
          supervised: "labels",
          unsupervised: "patterns",
          reinforcement: "rewards",
        },
      },
      points: 15,
      order: 10,
      difficulty: "Media",
    },
    {
      section: "Machine Learning",
      topic: "Datos de entrenamiento",
      type: QuestionType.MULTIPLE_SELECT,
      prompt: "Selecciona buenas prácticas al preparar datos para entrenar un modelo de IA.",
      instructions: "Selecciona todas las opciones correctas.",
      optionsJson: {
        options: [
          { id: "clean", text: "Limpiar datos inconsistentes o duplicados." },
          { id: "split", text: "Separar datos de entrenamiento y prueba." },
          { id: "bias", text: "Revisar posibles sesgos en los datos." },
          { id: "privacy", text: "Proteger datos personales o sensibles." },
          { id: "ignore_errors", text: "Ignorar valores faltantes para ahorrar tiempo." },
          { id: "train_test_same", text: "Usar exactamente los mismos datos para entrenar y evaluar." },
        ],
      },
      correctAnswerJson: {
        values: ["clean", "split", "bias", "privacy"],
      },
      points: 10,
      order: 11,
      difficulty: "Media",
    },
    {
      section: "Machine Learning",
      topic: "Redes neuronales",
      type: QuestionType.TRUE_FALSE,
      prompt:
        "Las redes neuronales son una técnica dentro del Machine Learning y están formadas por capas de nodos o neuronas artificiales.",
      instructions: "Indica si la afirmación es verdadera o falsa.",
      optionsJson: {
        options: [
          { id: "true", text: "Verdadero" },
          { id: "false", text: "Falso" },
        ],
      },
      correctAnswerJson: { value: true },
      points: 5,
      order: 12,
      difficulty: "Básica",
    },
    {
      section: "Machine Learning",
      topic: "Sobreajuste",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Qué significa que un modelo tenga sobreajuste u overfitting?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "Que aprende demasiado bien los datos de entrenamiento y generaliza mal ante datos nuevos." },
          { id: "b", text: "Que no puede entrenarse con datos." },
          { id: "c", text: "Que siempre alcanza 100% de precisión real." },
          { id: "d", text: "Que el modelo no usa variables." },
        ],
      },
      correctAnswerJson: { value: "a" },
      points: 5,
      order: 13,
      difficulty: "Media",
    },
    {
      section: "Proceso de solución IA",
      topic: "Diseño de solución",
      type: QuestionType.ORDERING,
      prompt: "Ordena correctamente el proceso general para diseñar una solución de IA.",
      instructions: "Coloca los pasos en el orden correcto.",
      optionsJson: {
        options: [
          { id: "problem", text: "Definir el problema." },
          { id: "data", text: "Identificar y preparar los datos." },
          { id: "technique", text: "Seleccionar técnica o modelo." },
          { id: "train", text: "Entrenar y ajustar el modelo." },
          { id: "evaluate", text: "Evaluar resultados y riesgos." },
        ],
      },
      correctAnswerJson: {
        order: ["problem", "data", "technique", "train", "evaluate"],
      },
      points: 10,
      order: 14,
      difficulty: "Media",
    },
    {
      section: "Ética e impacto social",
      topic: "Sesgos algorítmicos",
      type: QuestionType.MULTIPLE_SELECT,
      prompt: "Selecciona riesgos éticos asociados al uso de IA.",
      instructions: "Selecciona todas las opciones correctas.",
      optionsJson: {
        options: [
          { id: "bias", text: "Sesgo o discriminación algorítmica." },
          { id: "privacy", text: "Uso inadecuado de datos personales." },
          { id: "opacity", text: "Falta de transparencia en decisiones automatizadas." },
          { id: "dependency", text: "Dependencia excesiva de herramientas automáticas." },
          { id: "always_correct", text: "Garantía absoluta de verdad." },
          { id: "no_errors", text: "Eliminación total de errores humanos." },
        ],
      },
      correctAnswerJson: {
        values: ["bias", "privacy", "opacity", "dependency"],
      },
      points: 10,
      order: 15,
      difficulty: "Media",
    },
    {
      section: "Ética e impacto social",
      topic: "Privacidad",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "¿Cuál sería una acción responsable al usar datos de alumnos para un sistema de IA?",
      instructions: "Selecciona una opción.",
      optionsJson: {
        options: [
          { id: "a", text: "Publicar los datos completos para que todos los revisen." },
          { id: "b", text: "Proteger datos personales, limitar accesos y usar solo la información necesaria." },
          { id: "c", text: "Usar cualquier dato disponible sin avisar." },
          { id: "d", text: "Eliminar toda revisión humana." },
        ],
      },
      correctAnswerJson: { value: "b" },
      points: 5,
      order: 16,
      difficulty: "Básica",
    },
    {
      section: "IA generativa",
      topic: "Prompts",
      type: QuestionType.ORDERING,
      prompt: "Ordena los elementos recomendados para construir un buen prompt académico.",
      instructions: "Coloca los elementos en el orden más lógico.",
      optionsJson: {
        options: [
          { id: "role", text: "Indicar el rol o contexto." },
          { id: "task", text: "Definir claramente la tarea." },
          { id: "data", text: "Proporcionar información o datos necesarios." },
          { id: "format", text: "Especificar el formato de salida." },
          { id: "criteria", text: "Agregar criterios de calidad o restricciones." },
        ],
      },
      correctAnswerJson: {
        order: ["role", "task", "data", "format", "criteria"],
      },
      points: 10,
      order: 17,
      difficulty: "Media",
    },
    {
      section: "Aplicaciones de IA",
      topic: "Uso educativo",
      type: QuestionType.OPEN_TEXT,
      prompt:
        "Explica dos formas en las que la Inteligencia Artificial puede apoyar el aprendizaje de los estudiantes y menciona un riesgo que debe cuidarse.",
      instructions: "Responde con tus propias palabras. Incluye ejemplos concretos.",
      optionsJson: null,
      correctAnswerJson: null,
      rubricJson: {
        criteria: [
          {
            name: "Uso educativo 1",
            points: 3,
            expected: "Explica una forma válida de apoyo al aprendizaje, como tutoría personalizada, retroalimentación, generación de ejercicios, explicación de conceptos o apoyo en estudio.",
          },
          {
            name: "Uso educativo 2",
            points: 3,
            expected: "Explica una segunda forma válida de apoyo al aprendizaje con un ejemplo diferente.",
          },
          {
            name: "Riesgo identificado",
            points: 2,
            expected: "Menciona un riesgo como dependencia, plagio, sesgo, privacidad, información falsa o falta de pensamiento crítico.",
          },
          {
            name: "Claridad y ejemplo",
            points: 2,
            expected: "La respuesta es clara, coherente e incluye al menos un ejemplo concreto.",
          },
        ],
      },
      points: 10,
      order: 18,
      difficulty: "Media",
    },
    {
      section: "Machine Learning",
      topic: "ML y redes neuronales",
      type: QuestionType.OPEN_TEXT,
      prompt:
        "Explica la diferencia entre Machine Learning y redes neuronales. Incluye un ejemplo de aplicación.",
      instructions: "Responde con tus propias palabras.",
      optionsJson: null,
      correctAnswerJson: null,
      rubricJson: {
        criteria: [
          {
            name: "Define Machine Learning",
            points: 3,
            expected: "Explica que Machine Learning permite aprender patrones a partir de datos para hacer predicciones, clasificaciones o decisiones.",
          },
          {
            name: "Define red neuronal",
            points: 3,
            expected: "Explica que una red neuronal es un modelo o técnica dentro del Machine Learning formada por capas de nodos o neuronas artificiales.",
          },
          {
            name: "Relaciona ambos conceptos",
            points: 2,
            expected: "Aclara que las redes neuronales son una técnica específica dentro del Machine Learning.",
          },
          {
            name: "Ejemplo correcto",
            points: 2,
            expected: "Incluye un ejemplo válido como reconocimiento de imágenes, predicción de riesgo, clasificación de texto o recomendadores.",
          },
        ],
      },
      points: 10,
      order: 19,
      difficulty: "Media",
    },
    {
      section: "Análisis de caso",
      topic: "Diseño de solución IA",
      type: QuestionType.CASE_ANALYSIS,
      prompt:
        "Una escuela quiere detectar alumnos con riesgo de reprobar antes de finalizar el semestre. Tiene datos de asistencia, tareas entregadas, calificaciones parciales y participación. ¿Qué solución de IA propondrías y qué riesgos deberías cuidar?",
      instructions:
        "Propón una solución completa. Menciona datos de entrada, técnica posible, salida esperada y riesgos.",
      optionsJson: null,
      correctAnswerJson: null,
      rubricJson: {
        criteria: [
          {
            name: "Identificación del problema",
            points: 2,
            expected: "Identifica que se trata de predecir o clasificar riesgo académico antes del cierre del semestre.",
          },
          {
            name: "Datos de entrada",
            points: 2,
            expected: "Menciona asistencia, tareas, calificaciones, participación u otras variables académicas relevantes.",
          },
          {
            name: "Técnica de IA recomendada",
            points: 2,
            expected: "Propone aprendizaje supervisado, clasificación, predicción de riesgo o modelo predictivo.",
          },
          {
            name: "Salida esperada y acción",
            points: 2,
            expected: "Describe una salida como nivel de riesgo y una acción como tutoría, alerta temprana o seguimiento docente.",
          },
          {
            name: "Riesgo ético o técnico",
            points: 2,
            expected: "Menciona sesgo, privacidad, errores de predicción, estigmatización o necesidad de revisión humana.",
          },
        ],
      },
      points: 10,
      order: 20,
      difficulty: "Alta",
    },
  ];

  for (const question of questions) {
    await prisma.question.create({
      data: {
        ...question,
        examId: exam.id,
      },
    });

    console.log(`✅ Pregunta ${question.order} creada`);
  }

  console.log("🎉 Examen de 20 preguntas creado correctamente");
  console.log("Título:", exam.title);
  console.log("Código de acceso: IA20");
  console.log("Duración: 120 minutos");
}

main()
  .catch((error) => {
    console.error("❌ Error creando examen de 20 preguntas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
