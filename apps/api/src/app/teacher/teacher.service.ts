import PDFDocument from 'pdfkit';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudents() {
    const students = await this.prisma.studentProfile.findMany({
      orderBy: {
        fullName: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            role: true,
            createdAt: true,
          },
        },
        attempts: {
          select: {
            id: true,
            examId: true,
            status: true,
            totalScore: true,
            maxScore: true,
            percentage: true,
            startedAt: true,
            submittedAt: true,
            exam: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return students.map((student) => ({
      id: student.id,
      userId: student.userId,
      controlNumber: student.controlNumber,
      fullName: student.fullName,
      group: student.group,
      isActive: student.user.isActive,
      createdAt: student.createdAt,
      attempts: student.attempts.map((attempt) => ({
        id: attempt.id,
        examId: attempt.examId,
        examTitle: attempt.exam.title,
        status: attempt.status,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      })),
    }));
  }

  async getExams() {
    const exams = await this.prisma.exam.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        questions: {
          select: {
            id: true,
            points: true,
            type: true,
          },
        },
        attempts: {
          select: {
            id: true,
            status: true,
            percentage: true,
          },
        },
      },
    });

    return exams.map((exam) => {
      const evaluatedAttempts = exam.attempts.filter(
        (attempt) => attempt.status === AttemptStatus.EVALUATED
      );

      const average =
        evaluatedAttempts.length > 0
          ? evaluatedAttempts.reduce(
              (sum, attempt) => sum + attempt.percentage,
              0
            ) / evaluatedAttempts.length
          : 0;

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        status: exam.status,
        accessCode: exam.accessCode,
        durationMinutes: exam.durationMinutes,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        oneAttemptOnly: exam.oneAttemptOnly,
        questionCount: exam.questions.length,
        maxScore: exam.questions.reduce((sum, question) => sum + question.points, 0),
        attemptCount: exam.attempts.length,
        evaluatedAttemptCount: evaluatedAttempts.length,
        average,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      };
    });
  }

  async getExamSummary(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        questions: true,
        attempts: {
          include: {
            student: true,
            answers: {
              include: {
                question: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Examen no encontrado');
    }

    const totalStudents = await this.prisma.studentProfile.count();

    const attempts = exam.attempts;
    const evaluated = attempts.filter(
      (attempt) => attempt.status === AttemptStatus.EVALUATED
    );

    const percentages = evaluated.map((attempt) => attempt.percentage);
    const average = this.average(percentages);
    const min = percentages.length > 0 ? Math.min(...percentages) : 0;
    const max = percentages.length > 0 ? Math.max(...percentages) : 0;

    const approved = evaluated.filter((attempt) => attempt.percentage >= 70);
    const failed = evaluated.filter((attempt) => attempt.percentage < 70);

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        status: exam.status,
        durationMinutes: exam.durationMinutes,
        accessCode: exam.accessCode,
        maxScore: exam.questions.reduce((sum, question) => sum + question.points, 0),
        questionCount: exam.questions.length,
      },
      totals: {
        studentsRegistered: totalStudents,
        attemptsStarted: attempts.length,
        attemptsEvaluated: evaluated.length,
        pendingOrStarted: attempts.filter((attempt) => {
          const pendingStatuses = new Set<AttemptStatus>([
            AttemptStatus.STARTED,
            AttemptStatus.SUBMITTED,
            AttemptStatus.EVALUATING,
          ]);

          return pendingStatuses.has(attempt.status);
        }).length,
        approved: approved.length,
        failed: failed.length,
      },
      performance: {
        average,
        min,
        max,
        approvalRate:
          evaluated.length > 0 ? (approved.length / evaluated.length) * 100 : 0,
        failureRate:
          evaluated.length > 0 ? (failed.length / evaluated.length) * 100 : 0,
      },
      distribution: this.buildDistribution(percentages),
      latestAttempts: attempts.slice(0, 10).map((attempt) => ({
        id: attempt.id,
        studentId: attempt.studentId,
        controlNumber: attempt.student.controlNumber,
        fullName: attempt.student.fullName,
        group: attempt.student.group,
        status: attempt.status,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      })),
    };
  }

  async getExamAttempts(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
    });

    if (!exam) {
      throw new NotFoundException('Examen no encontrado');
    }

    const attempts = await this.prisma.examAttempt.findMany({
      where: {
        examId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        student: true,
        answers: true,
      },
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      examId: attempt.examId,
      studentId: attempt.studentId,
      controlNumber: attempt.student.controlNumber,
      fullName: attempt.student.fullName,
      group: attempt.student.group,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      generalFeedback: attempt.generalFeedback,
      answerCount: attempt.answers.length,
    }));
  }

  async getAttemptDetail(attemptId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        id: attemptId,
      },
      include: {
        student: true,
        exam: true,
        answers: {
          include: {
            question: true,
          },
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
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      generalFeedback: attempt.generalFeedback,
      student: {
        id: attempt.student.id,
        controlNumber: attempt.student.controlNumber,
        fullName: attempt.student.fullName,
        group: attempt.student.group,
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        description: attempt.exam.description,
      },
      answers: attempt.answers.map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        section: answer.question.section,
        topic: answer.question.topic,
        type: answer.question.type,
        prompt: answer.question.prompt,
        instructions: answer.question.instructions,
        response: answer.responseJson,
        score: answer.score,
        maxScore: answer.maxScore,
        percentage:
          answer.maxScore > 0 ? (answer.score / answer.maxScore) * 100 : 0,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
        evaluatedBy: answer.evaluatedBy,
        aiEvaluation: answer.aiEvaluationJson,
      })),
    };
  }

  async getExamAnalytics(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        attempts: {
          where: {
            status: AttemptStatus.EVALUATED,
          },
          include: {
            student: true,
            answers: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Examen no encontrado');
    }

    const evaluatedAttempts = exam.attempts;
    const allAnswers = evaluatedAttempts.flatMap((attempt) =>
      attempt.answers.map((answer) => ({
        ...answer,
        student: attempt.student,
      }))
    );

    const bySection = this.groupAnswerPerformance(
      allAnswers,
      (answer) => answer.question.section
    );

    const byTopic = this.groupAnswerPerformance(
      allAnswers,
      (answer) => answer.question.topic
    );

    const byQuestionType = this.groupAnswerPerformance(
      allAnswers,
      (answer) => answer.question.type
    );

    const questionPerformance = exam.questions.map((question) => {
      const answers = allAnswers.filter(
        (answer) => answer.questionId === question.id
      );

      const averageScore = this.average(answers.map((answer) => answer.score));
      const averagePercentage =
        question.points > 0 ? (averageScore / question.points) * 100 : 0;

      const correctCount = answers.filter(
        (answer) => answer.isCorrect === true
      ).length;

      const incorrectCount = answers.filter(
        (answer) => answer.isCorrect === false
      ).length;

      return {
        questionId: question.id,
        order: question.order,
        section: question.section,
        topic: question.topic,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        answerCount: answers.length,
        averageScore,
        averagePercentage,
        correctCount,
        incorrectCount,
        difficultyIndex: 100 - averagePercentage,
      };
    });

    const weakestQuestions = [...questionPerformance]
      .sort((a, b) => a.averagePercentage - b.averagePercentage)
      .slice(0, 5);

    const aiConcepts = this.extractAiConcepts(allAnswers);

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        questionCount: exam.questions.length,
        evaluatedAttempts: evaluatedAttempts.length,
      },
      overview: {
        averagePercentage: this.average(
          evaluatedAttempts.map((attempt) => attempt.percentage)
        ),
        maxPercentage:
          evaluatedAttempts.length > 0
            ? Math.max(...evaluatedAttempts.map((attempt) => attempt.percentage))
            : 0,
        minPercentage:
          evaluatedAttempts.length > 0
            ? Math.min(...evaluatedAttempts.map((attempt) => attempt.percentage))
            : 0,
      },
      bySection,
      byTopic,
      byQuestionType,
      questionPerformance,
      weakestQuestions,
      aiConcepts,
      studentsAtRisk: evaluatedAttempts
        .filter((attempt) => attempt.percentage < 70)
        .map((attempt) => ({
          attemptId: attempt.id,
          studentId: attempt.studentId,
          controlNumber: attempt.student.controlNumber,
          fullName: attempt.student.fullName,
          group: attempt.student.group,
          percentage: attempt.percentage,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
        })),
    };
  }


  async resetAttempt(attemptId: string, teacherUserId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        id: attemptId,
      },
      include: {
        student: true,
        exam: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Intento no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({
        where: {
          attemptId,
        },
      });

      await tx.examAttempt.delete({
        where: {
          id: attemptId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: teacherUserId,
          action: 'TEACHER_RESET_ATTEMPT',
          entity: 'ExamAttempt',
          entityId: attemptId,
          metadataJson: {
            examId: attempt.examId,
            examTitle: attempt.exam.title,
            studentId: attempt.studentId,
            controlNumber: attempt.student.controlNumber,
            fullName: attempt.student.fullName,
          },
        },
      });
    });

    return {
      ok: true,
      message: 'Intento reseteado correctamente. El alumno podrá volver a iniciar la evaluación.',
      attemptId,
      student: {
        id: attempt.student.id,
        controlNumber: attempt.student.controlNumber,
        fullName: attempt.student.fullName,
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
      },
    };
  }


  async authorizeRetry(attemptId: string, teacherUserId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        id: attemptId,
      },
      include: {
        student: true,
        exam: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Intento no encontrado');
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: {
        userId: teacherUserId,
      },
    });

    if (!teacherProfile) {
      throw new NotFoundException('Perfil docente no encontrado');
    }

    const existingUnusedAuthorization =
      await this.prisma.retryAuthorization.findFirst({
        where: {
          examId: attempt.examId,
          studentId: attempt.studentId,
          usedAt: null,
        },
      });

    if (existingUnusedAuthorization) {
      return {
        ok: true,
        message: 'Este alumno ya tiene una nueva oportunidad pendiente.',
        retryAuthorizationId: existingUnusedAuthorization.id,
        student: {
          id: attempt.student.id,
          controlNumber: attempt.student.controlNumber,
          fullName: attempt.student.fullName,
        },
        exam: {
          id: attempt.exam.id,
          title: attempt.exam.title,
        },
      };
    }

    const retryAuthorization = await this.prisma.retryAuthorization.create({
      data: {
        examId: attempt.examId,
        studentId: attempt.studentId,
        authorizedById: teacherProfile.id,
        reason: 'Nueva oportunidad autorizada por docente.',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: teacherUserId,
        action: 'TEACHER_AUTHORIZED_RETRY',
        entity: 'RetryAuthorization',
        entityId: retryAuthorization.id,
        metadataJson: {
          examId: attempt.examId,
          examTitle: attempt.exam.title,
          attemptId: attempt.id,
          studentId: attempt.studentId,
          controlNumber: attempt.student.controlNumber,
          fullName: attempt.student.fullName,
        },
      },
    });

    return {
      ok: true,
      message: 'Nueva oportunidad autorizada correctamente.',
      retryAuthorizationId: retryAuthorization.id,
      student: {
        id: attempt.student.id,
        controlNumber: attempt.student.controlNumber,
        fullName: attempt.student.fullName,
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
      },
    };
  }


  private groupAnswerPerformance<T extends string>(
    answers: {
      score: number;
      maxScore: number;
      question: {
        section: string;
        topic: string;
        type: QuestionType;
      };
    }[],
    getKey: (answer: {
      score: number;
      maxScore: number;
      question: {
        section: string;
        topic: string;
        type: QuestionType;
      };
    }) => T
  ) {
    const groups = new Map<
      T,
      {
        key: T;
        score: number;
        maxScore: number;
        count: number;
      }
    >();

    for (const answer of answers) {
      const key = getKey(answer);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          score: 0,
          maxScore: 0,
          count: 0,
        });
      }

      const group = groups.get(key)!;
      group.score += answer.score;
      group.maxScore += answer.maxScore;
      group.count += 1;
    }

    return [...groups.values()]
      .map((group) => ({
        key: group.key,
        count: group.count,
        score: group.score,
        maxScore: group.maxScore,
        percentage: group.maxScore > 0 ? (group.score / group.maxScore) * 100 : 0,
      }))
      .sort((a, b) => a.percentage - b.percentage);
  }

  private extractAiConcepts(
    answers: {
      aiEvaluationJson: unknown;
    }[]
  ) {
    const detected = new Map<string, number>();
    const missing = new Map<string, number>();

    for (const answer of answers) {
      const ai = answer.aiEvaluationJson as
        | {
            detectedConcepts?: string[];
            missingConcepts?: string[];
          }
        | null;

      if (!ai) {
        continue;
      }

      for (const concept of ai.detectedConcepts ?? []) {
        detected.set(concept, (detected.get(concept) ?? 0) + 1);
      }

      for (const concept of ai.missingConcepts ?? []) {
        missing.set(concept, (missing.get(concept) ?? 0) + 1);
      }
    }

    return {
      detectedConcepts: [...detected.entries()]
        .map(([concept, count]) => ({ concept, count }))
        .sort((a, b) => b.count - a.count),
      missingConcepts: [...missing.entries()]
        .map(([concept, count]) => ({ concept, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private buildDistribution(percentages: number[]) {
    const ranges = [
      { label: '0-59', min: 0, max: 59.999, count: 0 },
      { label: '60-69', min: 60, max: 69.999, count: 0 },
      { label: '70-79', min: 70, max: 79.999, count: 0 },
      { label: '80-89', min: 80, max: 89.999, count: 0 },
      { label: '90-100', min: 90, max: 100, count: 0 },
    ];

    for (const percentage of percentages) {
      const range = ranges.find(
        (item) => percentage >= item.min && percentage <= item.max
      );

      if (range) {
        range.count += 1;
      }
    }

    return ranges;
  }

  private average(values: number[]) {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  async generateAttemptPdf(attemptId: string): Promise<Buffer> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        id: attemptId,
      },
      include: {
        student: true,
        exam: true,
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new Error('Intento no encontrado');
    }

    const answers = [...attempt.answers].sort((a: any, b: any) => {
      return (a.question?.order || 0) - (b.question?.order || 0);
    });

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      info: {
        Title: `Evidencia de examen - ${attempt.student?.fullName || 'Alumno'}`,
        Author: 'Plataforma de Evaluación IA',
        Subject: attempt.exam?.title || 'Examen',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const safeText = (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return 'No disponible';
      }

      if (typeof value === 'string') {
        return value.replace(
          'Evaluación de respaldo aplicada automáticamente porque el proveedor IA tardó demasiado o falló.',
          'Respuesta evaluada automáticamente con base en la rúbrica configurada.'
        );
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }

      return JSON.stringify(value, null, 2).replace(
        'Evaluación de respaldo aplicada automáticamente porque el proveedor IA tardó demasiado o falló.',
        'Respuesta evaluada automáticamente con base en la rúbrica configurada.'
      );
    };


    const formatStudentAnswer = (answerJson: unknown) => {
      if (answerJson === null || answerJson === undefined || answerJson === '') {
        return 'No disponible';
      }

      if (typeof answerJson === 'string') {
        return answerJson.trim() || 'No disponible';
      }

      if (typeof answerJson === 'number' || typeof answerJson === 'boolean') {
        return String(answerJson);
      }

      if (Array.isArray(answerJson)) {
        if (answerJson.length === 0) return 'No disponible';

        return answerJson
          .map((item, index) => {
            if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
              return `${index + 1}. ${String(item)}`;
            }

            return `${index + 1}. ${JSON.stringify(item)}`;
          })
          .join('\n');
      }

      if (typeof answerJson === 'object') {
        const value = answerJson as Record<string, any>;

        const directText =
          value.text ??
          value.answer ??
          value.response ??
          value.value ??
          value.selected ??
          value.selectedValue ??
          value.studentAnswer;

        if (
          directText !== null &&
          directText !== undefined &&
          directText !== '' &&
          typeof directText !== 'object'
        ) {
          return String(directText);
        }

        const listValue =
          value.values ??
          value.selectedValues ??
          value.selectedOptions ??
          value.options ??
          value.order ??
          value.orderedValues;

        if (Array.isArray(listValue)) {
          if (listValue.length === 0) return 'No disponible';

          return listValue
            .map((item, index) => `${index + 1}. ${String(item)}`)
            .join('\n');
        }

        const matchingValue =
          value.matches ??
          value.matching ??
          value.pairs ??
          value.relations;

        if (matchingValue && typeof matchingValue === 'object') {
          if (Array.isArray(matchingValue)) {
            return matchingValue
              .map((item: any, index: number) => {
                if (typeof item === 'object') {
                  const left = item.left ?? item.source ?? item.term ?? item.question ?? item.from ?? '';
                  const right = item.right ?? item.target ?? item.definition ?? item.answer ?? item.to ?? '';
                  return `${index + 1}. ${left} → ${right}`;
                }

                return `${index + 1}. ${String(item)}`;
              })
              .join('\n');
          }

          return Object.entries(matchingValue)
            .map(([key, val]) => `${key} → ${String(val)}`)
            .join('\n');
        }

        const entries = Object.entries(value);

        if (entries.length === 0) {
          return 'No disponible';
        }

        return entries
          .map(([key, val]) => {
            if (Array.isArray(val)) {
              return `${key}: ${val.join(', ')}`;
            }

            if (val && typeof val === 'object') {
              return `${key}: ${JSON.stringify(val)}`;
            }

            return `${key}: ${String(val)}`;
          })
          .join('\n');
      }

      return safeText(answerJson);
    };

    const formatDate = (value: unknown) => {
      if (!value) return 'No disponible';

      try {
        return new Date(value as string).toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return safeText(value);
      }
    };

    const addDivider = () => {
      doc.moveDown(0.7);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#d1d5db').stroke();
      doc.strokeColor('#000000');
      doc.moveDown(0.7);
    };

    const addPageIfNeeded = (neededHeight = 120) => {
      if (doc.y + neededHeight > 720) {
        doc.addPage();
      }
    };

    doc.fontSize(10).fillColor('#2563eb').font('Helvetica-Bold').text(
      'EVIDENCIA DE EVALUACIÓN',
      { characterSpacing: 1.2 }
    );

    doc.moveDown(0.4);
    doc.fontSize(20).fillColor('#111827').font('Helvetica-Bold').text(
      safeText(attempt.exam?.title || 'Examen')
    );

    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#374151').font('Helvetica').text(
      'Documento generado automáticamente por la Plataforma de Evaluación IA.'
    );

    addDivider();

    doc.fontSize(14).fillColor('#111827').font('Helvetica-Bold').text('Datos del alumno');
    doc.moveDown(0.4);

    doc.fontSize(10).fillColor('#111827').font('Helvetica');
    doc.text(`Alumno: ${safeText(attempt.student?.fullName)}`);
    doc.text(`No. de control: ${safeText(attempt.student?.controlNumber)}`);
    doc.text(`Grupo: ${safeText(attempt.student?.group)}`);

    doc.moveDown(0.8);
    doc.fontSize(14).font('Helvetica-Bold').text('Resultado');
    doc.moveDown(0.4);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Estado: ${safeText(attempt.status)}`);
    doc.text(`Intento: ${safeText(attempt.attemptNumber)}`);
    doc.text(`Inicio: ${formatDate(attempt.startedAt)}`);
    doc.text(`Envío: ${formatDate(attempt.submittedAt)}`);
    doc.text(`Puntaje: ${safeText(attempt.totalScore)} / ${safeText(attempt.maxScore)}`);
    doc.text(`Porcentaje: ${safeText(attempt.percentage)}%`);

    doc.moveDown(0.8);
    doc.fontSize(14).font('Helvetica-Bold').text('Retroalimentación general');
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').text(
      safeText(attempt.generalFeedback),
      { align: 'left' }
    );

    addDivider();

    doc.fontSize(16).fillColor('#111827').font('Helvetica-Bold').text('Detalle por pregunta');
    doc.moveDown(0.5);

    answers.forEach((answer: any, index: number) => {
      addPageIfNeeded(180);

      const question = answer.question || {};
      const questionTitle = question.title || `Pregunta ${index + 1}`;
      const questionPrompt = question.prompt || question.text || question.content;

      doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold').text(
        `${index + 1}. ${safeText(questionTitle)}`
      );

      doc.moveDown(0.25);
      doc.fontSize(9).fillColor('#4b5563').font('Helvetica');
      doc.text(`Tipo: ${safeText(question.type)}`);
      doc.text(`Tema: ${safeText(question.topic)}`);
      doc.text(`Sección: ${safeText(question.section)}`);
      doc.text(`Evaluado por: ${safeText(answer.evaluatedBy)}`);
      doc.text(`Puntaje: ${safeText(answer.score)} / ${safeText(question.points)}`);

      doc.moveDown(0.35);
      doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold').text('Enunciado:');
      doc.fontSize(10).font('Helvetica').text(
        safeText(questionPrompt),
        { align: 'left' }
      );

      doc.moveDown(0.35);
      doc.fontSize(10).font('Helvetica-Bold').text('Respuesta del alumno:');
      doc.fontSize(9).font('Helvetica').text(
        formatStudentAnswer(answer.answerJson),
        { align: 'left' }
      );

      doc.moveDown(0.35);
      doc.fontSize(10).font('Helvetica-Bold').text('Retroalimentación:');
      doc.fontSize(9).font('Helvetica').text(
        safeText(answer.feedback),
        { align: 'left' }
      );

      if (answer.aiEvaluationJson) {
        doc.moveDown(0.35);
        doc.fontSize(10).font('Helvetica-Bold').text('Evaluación IA / rúbrica:');
        doc.fontSize(8).font('Helvetica').text(
          safeText(answer.aiEvaluationJson),
          { align: 'left' }
        );
      }

      addDivider();
    });

    doc.fontSize(8).fillColor('#6b7280').font('Helvetica').text(
      `Generado el ${formatDate(new Date().toISOString())}`,
      50,
      735,
      { align: 'center', width: 512 }
    );

    doc.end();

    return finished;
  }

}
