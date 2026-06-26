import { Injectable } from '@nestjs/common';
import { ExamStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableExamsForStudent(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return [];
    }

    const now = new Date();

    const exams = await this.prisma.exam.findMany({
      where: {
        status: ExamStatus.PUBLISHED,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      include: {
        attempts: {
          where: {
            studentId: student.id,
          },
          orderBy: {
            attemptNumber: 'desc',
          },
          take: 1,
        },
        questions: {
          select: {
            id: true,
            points: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return exams.map((exam) => {
      const lastAttempt = exam.attempts[0] ?? null;
      const maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        oneAttemptOnly: exam.oneAttemptOnly,
        questionCount: exam.questions.length,
        maxScore,
        attempt: lastAttempt
          ? {
              id: lastAttempt.id,
              status: lastAttempt.status,
              startedAt: lastAttempt.startedAt,
              submittedAt: lastAttempt.submittedAt,
              percentage: lastAttempt.percentage,
            }
          : null,
        canStart: !lastAttempt || lastAttempt.status === 'CANCELLED',
      };
    });
  }
}
