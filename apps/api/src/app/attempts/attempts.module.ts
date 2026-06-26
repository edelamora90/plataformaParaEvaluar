import { Module } from '@nestjs/common';
import { AiEvaluatorModule } from '../ai-evaluator/ai-evaluator.module';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';

@Module({
  imports: [AiEvaluatorModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
