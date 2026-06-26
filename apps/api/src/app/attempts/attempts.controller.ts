import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: UserRole;
  };
};

@Controller('attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('start')
  @Roles(UserRole.STUDENT)
  startAttempt(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartAttemptDto
  ) {
    return this.attemptsService.startAttempt(req.user.userId, dto);
  }

  @Get(':attemptId')
  @Roles(UserRole.STUDENT)
  getAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('attemptId') attemptId: string
  ) {
    return this.attemptsService.getAttemptForStudent(req.user.userId, attemptId);
  }

  @Post(':attemptId/submit')
  @Roles(UserRole.STUDENT)
  submitAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto
  ) {
    return this.attemptsService.submitAttempt(req.user.userId, attemptId, dto);
  }
}
