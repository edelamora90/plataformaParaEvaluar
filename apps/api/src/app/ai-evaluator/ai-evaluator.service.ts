import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

export type AiRubricCriterion = {
  name: string;
  points: number;
  expected: string;
};

export type EvaluateOpenAnswerInput = {
  questionPrompt: string;
  questionInstructions?: string | null;
  topic: string;
  section: string;
  maxScore: number;
  studentAnswer: string;
  rubric: {
    criteria: AiRubricCriterion[];
  };
};

export type AiOpenAnswerEvaluation = {
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  detectedConcepts: string[];
  missingConcepts: string[];
  confidence: number;
};

@Injectable()
export class AiEvaluatorService {
  private readonly client: OpenAI | null;
  private readonly provider: string;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'mock';

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (this.provider === 'openrouter' && openRouterKey) {
      this.client = new OpenAI({
        apiKey: openRouterKey,
        baseURL:
          process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer':
            process.env.OPENROUTER_SITE_URL || 'http://localhost:4200',
          'X-Title':
            process.env.OPENROUTER_APP_NAME || 'Clase IA Evaluaciones',
        },
      });

      return;
    }

    if (this.provider === 'openai' && openAiKey) {
      this.client = new OpenAI({
        apiKey: openAiKey,
      });

      return;
    }

    this.client = null;
  }

  async evaluateOpenAnswer(
    input: EvaluateOpenAnswerInput
  ): Promise<AiOpenAnswerEvaluation> {
    if (!this.client) {
      console.log('[AI] Sin proveedor configurado. Usando mock.');
      return this.mockEvaluation(input);
    }

    try {
      return await this.evaluateWithTimeout(input, 25000);
    } catch (error) {
      console.error('[AI] Falló evaluación IA. Usando fallback mock.', error);
      return this.mockEvaluation(input);
    }
  }

  private async evaluateWithTimeout(
    input: EvaluateOpenAnswerInput,
    timeoutMs: number
  ): Promise<AiOpenAnswerEvaluation> {
    return Promise.race([
      this.evaluateWithProvider(input),
      new Promise<AiOpenAnswerEvaluation>((resolve) => {
        setTimeout(() => {
          console.warn('[AI] Timeout de proveedor. Usando mock.');
          resolve(this.mockEvaluation(input));
        }, timeoutMs);
      }),
    ]);
  }

  private async evaluateWithProvider(
    input: EvaluateOpenAnswerInput
  ): Promise<AiOpenAnswerEvaluation> {
    const model =
      this.provider === 'openrouter'
        ? process.env.OPENROUTER_MODEL || 'openrouter/free'
        : process.env.AI_EVALUATION_MODEL || 'gpt-4.1-mini';

    console.log('[AI] Evaluando respuesta abierta:', {
      provider: this.provider,
      model,
      topic: input.topic,
      maxScore: input.maxScore,
    });

    const systemPrompt = `
Eres un asistente evaluador académico para una materia de Inteligencia Artificial.
Evalúa respuestas de alumnos usando estrictamente la rúbrica proporcionada.
No inventes criterios adicionales.
No castigues redacción menor si el concepto es correcto.
No des más puntos que el máximo.
Devuelve exclusivamente JSON válido, sin markdown, sin comentarios y sin texto adicional.
`.trim();

    const userPayload = {
      task: 'Evaluar respuesta abierta',
      section: input.section,
      topic: input.topic,
      question: input.questionPrompt,
      instructions: input.questionInstructions,
      maxScore: input.maxScore,
      rubric: input.rubric,
      studentAnswer: input.studentAnswer,
      requiredJsonShape: {
        score: 'number entre 0 y maxScore',
        maxScore: input.maxScore,
        feedback: 'retroalimentación breve y útil para el alumno',
        strengths: ['fortalezas detectadas'],
        improvements: ['áreas de mejora'],
        detectedConcepts: ['conceptos presentes'],
        missingConcepts: ['conceptos ausentes importantes'],
        confidence: 'number entre 0 y 1',
      },
    };

    const response = await this.client!.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: JSON.stringify(userPayload),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;

    if (!raw) {
      return this.mockEvaluation(input);
    }

    const parsed = this.safeJsonParse(raw);

    return this.normalizeEvaluation(parsed, input.maxScore);
  }

  private safeJsonParse(raw: string): Partial<AiOpenAnswerEvaluation> {
    try {
      return JSON.parse(raw) as Partial<AiOpenAnswerEvaluation>;
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);

      if (!match) {
        return {
          feedback:
            'La IA respondió, pero no devolvió JSON válido. Se aplicó evaluación de respaldo.',
          score: 0,
        };
      }

      try {
        return JSON.parse(match[0]) as Partial<AiOpenAnswerEvaluation>;
      } catch {
        return {
          feedback:
            'La IA respondió con formato inválido. Se aplicó evaluación de respaldo.',
          score: 0,
        };
      }
    }
  }

  private normalizeEvaluation(
    evaluation: Partial<AiOpenAnswerEvaluation>,
    maxScore: number
  ): AiOpenAnswerEvaluation {
    const safeScore = Math.min(
      Math.max(Number(evaluation.score || 0), 0),
      maxScore
    );

    const safeConfidence = Math.min(
      Math.max(Number(evaluation.confidence || 0), 0),
      1
    );

    return {
      score: safeScore,
      maxScore,
      feedback: evaluation.feedback || 'Respuesta evaluada.',
      strengths: Array.isArray(evaluation.strengths)
        ? evaluation.strengths
        : [],
      improvements: Array.isArray(evaluation.improvements)
        ? evaluation.improvements
        : [],
      detectedConcepts: Array.isArray(evaluation.detectedConcepts)
        ? evaluation.detectedConcepts
        : [],
      missingConcepts: Array.isArray(evaluation.missingConcepts)
        ? evaluation.missingConcepts
        : [],
      confidence: safeConfidence,
    };
  }

  private mockEvaluation(
    input: EvaluateOpenAnswerInput
  ): AiOpenAnswerEvaluation {
    const answer = input.studentAnswer.toLowerCase();

    const criteria = input.rubric.criteria || [];
    let score = 0;
    const detectedConcepts: string[] = [];
    const missingConcepts: string[] = [];

    for (const criterion of criteria) {
      const expectedWords = criterion.expected
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 5);

      const hits = expectedWords.filter((word) => answer.includes(word));

      if (hits.length > 0) {
        score += criterion.points * 0.75;
        detectedConcepts.push(criterion.name);
      } else {
        missingConcepts.push(criterion.name);
      }
    }

    if (criteria.length === 0 && input.studentAnswer.trim().length > 30) {
      score = input.maxScore * 0.7;
    }

    score = Math.min(score, input.maxScore);

    return {
      score,
      maxScore: input.maxScore,
      feedback:
        'Evaluación de respaldo aplicada automáticamente porque el proveedor IA tardó demasiado o falló.',
      strengths:
        detectedConcepts.length > 0
          ? detectedConcepts
          : ['Respuesta registrada correctamente'],
      improvements:
        missingConcepts.length > 0
          ? missingConcepts
          : ['Puede profundizar más en la explicación'],
      detectedConcepts,
      missingConcepts,
      confidence: 0.5,
    };
  }
}
