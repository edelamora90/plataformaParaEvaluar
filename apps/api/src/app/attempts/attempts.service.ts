import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  EvaluatedBy,
  ExamStatus,
  Question,
  QuestionType,
} from '@prisma/client';
import { AiEvaluatorService } from '../ai-evaluator/ai-evaluator.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEvaluator: AiEvaluatorService
  ) {}

  async startAttempt(userId: string, dto: StartAttemptDto) {
    const student = await this.getStudentByUserId(userId);

    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Examen no encontrado');
    }

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenException('El examen no está disponible');
    }

    const now = new Date();

    if (exam.startsAt && exam.startsAt > now) {
      throw new ForbiddenException('El examen todavía no inicia');
    }

    if (exam.endsAt && exam.endsAt < now) {
      throw new ForbiddenException('El examen ya finalizó');
    }

    if (exam.accessCode && exam.accessCode !== dto.accessCode) {
      throw new ForbiddenException('Código de examen incorrecto');
    }

    const existingAttempts = await this.prisma.examAttempt.findMany({
      where: {
        examId: exam.id,
        studentId: student.id,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
    });

    const blockingStatuses = new Set<AttemptStatus>([
      AttemptStatus.STARTED,
      AttemptStatus.SUBMITTED,
      AttemptStatus.EVALUATING,
      AttemptStatus.EVALUATED,
    ]);

    const activeOrFinalAttempt = existingAttempts.find((attempt) =>
      blockingStatuses.has(attempt.status)
    );

    if (activeOrFinalAttempt) {
      if (activeOrFinalAttempt.status === AttemptStatus.STARTED) {
        return this.getAttemptForStudent(userId, activeOrFinalAttempt.id);
      }

      const retryAuthorization = await this.prisma.retryAuthorization.findFirst({
        where: {
          examId: exam.id,
          studentId: student.id,
          usedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!retryAuthorization) {
        throw new ConflictException(
          'Ya existe un intento registrado para este examen'
        );
      }

      await this.prisma.retryAuthorization.update({
        where: {
          id: retryAuthorization.id,
        },
        data: {
          usedAt: now,
        },
      });
    }

    const maxScore = exam.questions.reduce(
      (total, question) => total + question.points,
      0
    );

    const expiresAt = exam.durationMinutes
      ? new Date(now.getTime() + exam.durationMinutes * 60 * 1000)
      : null;

    const nextAttemptNumber =
      existingAttempts.length > 0 ? existingAttempts[0].attemptNumber + 1 : 1;

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        attemptNumber: nextAttemptNumber,
        status: AttemptStatus.STARTED,
        maxScore,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'STUDENT_STARTED_EXAM',
        entity: 'ExamAttempt',
        entityId: attempt.id,
        metadataJson: {
          examId: exam.id,
          examTitle: exam.title,
        },
      },
    });

    return this.getAttemptForStudent(userId, attempt.id);
  }

  async getAttemptForStudent(userId: string, attemptId: string) {
    const student = await this.getStudentByUserId(userId);

    const attempt = await this.prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: student.id,
      },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Intento no encontrado');
    }

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      generalFeedback: attempt.generalFeedback,
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        description: attempt.exam.description,
        durationMinutes: attempt.exam.durationMinutes,
        showResultToStudent: attempt.exam.showResultToStudent,
        showCorrectAnswersToStudent: attempt.exam.showCorrectAnswersToStudent,
        questions: attempt.exam.questions.map((question) =>
          this.sanitizeQuestion(question)
        ),
      },
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        response: answer.responseJson,
        score: answer.score,
        maxScore: answer.maxScore,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
        evaluatedBy: answer.evaluatedBy,
        aiEvaluation: answer.aiEvaluationJson,
      })),
    };
  }

  async submitAttempt(userId: string, attemptId: string, dto: SubmitAttemptDto) {
    const student = await this.getStudentByUserId(userId);

    const attempt = await this.prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: student.id,
      },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Intento no encontrado');
    }

    if (attempt.status !== AttemptStatus.STARTED) {
      throw new ConflictException('Este intento ya fue enviado o evaluado');
    }

    const now = new Date();

    if (attempt.expiresAt && attempt.expiresAt < now) {
      await this.prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          status: AttemptStatus.EXPIRED,
        },
      });

      throw new ForbiddenException('El tiempo del examen expiró');
    }

    let totalScore = 0;
    let maxScore = 0;
    const topicFeedback: string[] = [];

    for (const question of attempt.exam.questions) {
      maxScore += question.points;

      const submittedAnswer = dto.answers.find(
        (answer) => answer.questionId === question.id
      );

      const response = submittedAnswer?.response ?? null;
      const result = await this.evaluateAnswer(question, response);

      totalScore += result.score;

      if (result.feedback) {
        topicFeedback.push(`${question.topic}: ${result.feedback}`);
      }

      await this.prisma.answer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: question.id,
          },
        },
        update: {
          responseJson: this.asJsonObject(response),
          score: result.score,
          maxScore: question.points,
          isCorrect: result.isCorrect,
          feedback: result.feedback,
          evaluatedBy: result.evaluatedBy,
          aiEvaluationJson: result.aiEvaluationJson,
        },
        create: {
          attemptId: attempt.id,
          questionId: question.id,
          responseJson: this.asJsonObject(response),
          score: result.score,
          maxScore: question.points,
          isCorrect: result.isCorrect,
          feedback: result.feedback,
          evaluatedBy: result.evaluatedBy,
          aiEvaluationJson: result.aiEvaluationJson,
        },
      });
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    await this.prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.EVALUATED,
        submittedAt: now,
        totalScore,
        maxScore,
        percentage,
        generalFeedback: this.buildGeneralFeedback(percentage, topicFeedback),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'STUDENT_SUBMITTED_AND_EVALUATED_EXAM',
        entity: 'ExamAttempt',
        entityId: attempt.id,
        metadataJson: {
          examId: attempt.exam.id,
          totalScore,
          maxScore,
          percentage,
        },
      },
    });

    return this.getAttemptForStudent(userId, attempt.id);
  }

  private async evaluateAnswer(question: Question, response: unknown) {
    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.TRUE_FALSE:
        return this.evaluateSingleValue(question, response);

      case QuestionType.MULTIPLE_SELECT:
        return this.evaluateMultipleSelect(question, response);

      case QuestionType.MATCHING:
        return this.evaluateMatching(question, response);

      case QuestionType.ORDERING:
        return this.evaluateOrdering(question, response);

      case QuestionType.OPEN_TEXT:
      case QuestionType.CASE_ANALYSIS:
        return this.evaluateOpenAnswerWithAi(question, response);

      default:
        return {
          score: 0,
          isCorrect: false,
          feedback: 'Tipo de pregunta no soportado.',
          evaluatedBy: EvaluatedBy.SYSTEM,
          aiEvaluationJson: null,
        };
    }
  }

  private async evaluateOpenAnswerWithAi(question: Question, response: unknown) {
    const answerText = this.extractTextResponse(response);

    if (!answerText) {
      return {
        score: 0,
        isCorrect: false,
        feedback: 'No se recibió respuesta para evaluar.',
        evaluatedBy: EvaluatedBy.AI,
        aiEvaluationJson: {
          score: 0,
          maxScore: question.points,
          feedback: 'No se recibió respuesta para evaluar.',
          strengths: [],
          improvements: ['Responder la pregunta abierta.'],
          detectedConcepts: [],
          missingConcepts: ['Respuesta ausente'],
          confidence: 1,
        },
      };
    }

    const rubric = this.parseRubric(question.rubricJson);

    const evaluation = await this.aiEvaluator.evaluateOpenAnswer({
      questionPrompt: question.prompt,
      questionInstructions: question.instructions,
      topic: question.topic,
      section: question.section,
      maxScore: question.points,
      studentAnswer: answerText,
      rubric,
    });

    return {
      score: evaluation.score,
      isCorrect: evaluation.score >= question.points * 0.7,
      feedback: evaluation.feedback,
      evaluatedBy: EvaluatedBy.AI,
      aiEvaluationJson: evaluation,
    };
  }

  private evaluateSingleValue(question: Question, response: unknown) {
    const correct = question.correctAnswerJson as { value?: unknown } | null;
    const expectedValue = correct?.value;

    const responseValue =
      typeof response === 'object' && response !== null && 'value' in response
        ? (response as { value: unknown }).value
        : response;

    const isCorrect = responseValue === expectedValue;

    return {
      score: isCorrect ? question.points : 0,
      isCorrect,
      feedback: isCorrect ? 'Respuesta correcta.' : 'Respuesta incorrecta.',
      evaluatedBy: EvaluatedBy.SYSTEM,
      aiEvaluationJson: null,
    };
  }

  private evaluateMultipleSelect(question: Question, response: unknown) {
    const correct = question.correctAnswerJson as { values?: string[] } | null;
    const expected = [...(correct?.values ?? [])].sort();

    const responseValues =
      typeof response === 'object' && response !== null && 'values' in response
        ? (response as { values: string[] }).values
        : response;

    const selected = Array.isArray(responseValues)
      ? [...responseValues].sort()
      : [];

    const isCorrect =
      selected.length === expected.length &&
      selected.every((value, index) => value === expected[index]);

    return {
      score: isCorrect ? question.points : 0,
      isCorrect,
      feedback: isCorrect
        ? 'Selección correcta.'
        : 'La selección no coincide completamente con la respuesta esperada.',
      evaluatedBy: EvaluatedBy.SYSTEM,
      aiEvaluationJson: null,
    };
  }

  private evaluateMatching(question: Question, response: unknown) {
    const correct = question.correctAnswerJson as {
      pairs?: Record<string, string>;
    } | null;

    const expectedPairs = correct?.pairs ?? {};

    const responsePairs =
      typeof response === 'object' && response !== null && 'pairs' in response
        ? (response as { pairs: Record<string, string> }).pairs
        : {};

    const expectedKeys = Object.keys(expectedPairs);

    const correctCount = expectedKeys.filter(
      (key) => responsePairs[key] === expectedPairs[key]
    ).length;

    const score =
      expectedKeys.length > 0
        ? (correctCount / expectedKeys.length) * question.points
        : 0;

    const isCorrect = correctCount === expectedKeys.length;

    return {
      score,
      isCorrect,
      feedback: isCorrect
        ? 'Relación correcta.'
        : `Relaciones correctas: ${correctCount} de ${expectedKeys.length}.`,
      evaluatedBy: EvaluatedBy.SYSTEM,
      aiEvaluationJson: null,
    };
  }

  private evaluateOrdering(question: Question, response: unknown) {
    const correct = question.correctAnswerJson as { order?: string[] } | null;
    const expectedOrder = correct?.order ?? [];

    const responseOrder =
      typeof response === 'object' && response !== null && 'order' in response
        ? (response as { order: string[] }).order
        : [];

    const correctCount = expectedOrder.filter(
      (value, index) => responseOrder[index] === value
    ).length;

    const score =
      expectedOrder.length > 0
        ? (correctCount / expectedOrder.length) * question.points
        : 0;

    const isCorrect = correctCount === expectedOrder.length;

    return {
      score,
      isCorrect,
      feedback: isCorrect
        ? 'Orden correcto.'
        : `Elementos en posición correcta: ${correctCount} de ${expectedOrder.length}.`,
      evaluatedBy: EvaluatedBy.SYSTEM,
      aiEvaluationJson: null,
    };
  }

  private sanitizeQuestion(question: Question) {
    return {
      id: question.id,
      section: question.section,
      topic: question.topic,
      type: question.type,
      prompt: question.prompt,
      instructions: question.instructions,
      options: question.optionsJson,
      points: question.points,
      order: question.order,
      difficulty: question.difficulty,
    };
  }

  private buildGeneralFeedback(percentage: number, topicFeedback: string[]) {
    let summary = '';

    if (percentage >= 90) {
      summary =
        'Excelente desempeño. Dominas los conceptos principales de la evaluación.';
    } else if (percentage >= 80) {
      summary =
        'Buen desempeño. Tienes bases sólidas, aunque hay algunos conceptos que puedes reforzar.';
    } else if (percentage >= 70) {
      summary =
        'Desempeño suficiente. Se recomienda repasar los temas con menor puntaje.';
    } else {
      summary =
        'Desempeño insuficiente. Es necesario reforzar los conceptos fundamentales antes de avanzar.';
    }

    if (topicFeedback.length === 0) {
      return summary;
    }

    return `${summary} Detalle: ${topicFeedback.join(' | ')}`;
  }

  private parseRubric(rubricJson: unknown) {
    if (
      typeof rubricJson === 'object' &&
      rubricJson !== null &&
      'criteria' in rubricJson &&
      Array.isArray((rubricJson as { criteria: unknown }).criteria)
    ) {
      return rubricJson as {
        criteria: {
          name: string;
          points: number;
          expected: string;
        }[];
      };
    }

    return {
      criteria: [],
    };
  }

  private extractTextResponse(response: unknown) {
    if (typeof response === 'string') {
      return response.trim();
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'text' in response &&
      typeof (response as { text: unknown }).text === 'string'
    ) {
      return (response as { text: string }).text.trim();
    }

    return '';
  }

  private asJsonObject(value: unknown) {
    if (value === null || value === undefined) {
      return {};
    }

    if (typeof value === 'object') {
      return value as object;
    }

    return {
      value,
    };
  }

  private async getStudentByUserId(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new ForbiddenException('El usuario no es alumno');
    }

    return student;
  }
}
