import { Module } from '@nestjs/common';
import { AiEvaluatorService } from './ai-evaluator.service';

@Module({
  providers: [AiEvaluatorService],
  exports: [AiEvaluatorService],
})
export class AiEvaluatorModule {}
