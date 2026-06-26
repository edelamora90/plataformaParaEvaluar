import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartAttemptDto {
  @IsString()
  @IsNotEmpty()
  examId!: string;

  @IsString()
  @IsOptional()
  accessCode?: string;
}
