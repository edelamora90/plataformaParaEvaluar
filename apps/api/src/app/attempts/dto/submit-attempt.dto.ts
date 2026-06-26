import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  response!: unknown;
}

export class SubmitAttemptDto {
  @IsArray()
  answers!: SubmitAnswerDto[];
}
