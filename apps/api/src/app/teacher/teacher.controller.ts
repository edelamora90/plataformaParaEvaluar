import { Res, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TeacherService } from './teacher.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: UserRole;
  };
};

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return {
      userId: req.user.userId,
      role: req.user.role,
    };
  }

  @Get('students')
  getStudents() {
    return this.teacherService.getStudents();
  }

  @Get('exams')
  getExams() {
    return this.teacherService.getExams();
  }

  @Get('exams/:examId/summary')
  getExamSummary(@Param('examId') examId: string) {
    return this.teacherService.getExamSummary(examId);
  }

  @Get('exams/:examId/attempts')
  getExamAttempts(@Param('examId') examId: string) {
    return this.teacherService.getExamAttempts(examId);
  }

  @Get('exams/:examId/analytics')
  getExamAnalytics(@Param('examId') examId: string) {
    return this.teacherService.getExamAnalytics(examId);
  }


  @Delete('attempts/:attemptId/reset')
  resetAttempt(
    @Param('attemptId') attemptId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.teacherService.resetAttempt(attemptId, req.user.userId);
  }

  @Post('attempts/:attemptId/retry')
  authorizeRetry(
    @Param('attemptId') attemptId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.teacherService.authorizeRetry(attemptId, req.user.userId);
  }

  @Get('attempts/:attemptId')
  getAttemptDetail(@Param('attemptId') attemptId: string) {
    return this.teacherService.getAttemptDetail(attemptId);
  }

  @Get('attempts/:attemptId/pdf')
  async downloadAttemptPdf(
    @Param('attemptId') attemptId: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.teacherService.generateAttemptPdf(attemptId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="evidencia-examen-${attemptId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

}
