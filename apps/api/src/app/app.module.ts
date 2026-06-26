import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiEvaluatorModule } from './ai-evaluator/ai-evaluator.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AuthModule } from './auth/auth.module';
import { ExamsModule } from './exams/exams.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TeacherModule } from './teacher/teacher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ExamsModule,
    AiEvaluatorModule,
    AttemptsModule,
    TeacherModule,
  ],
})
export class AppModule {}
