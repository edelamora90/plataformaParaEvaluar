import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';

@Component({
  selector: 'app-student-attempt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-attempt.component.html',
  styleUrl: './student-attempt.component.scss',
})
export class StudentAttemptComponent implements OnInit {
  attemptId = '';
  attempt = signal<any | null>(null);
  loading = signal(true);
  submitting = signal(false);
  error = signal('');

  answers: Record<string, any> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService
  ) {}

  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId') || '';

    this.api.getAttempt(this.attemptId).subscribe({
      next: (attempt: any) => {
        this.attempt.set(attempt);
        this.prepareAnswers(attempt);
        this.loading.set(false);

        if (attempt.status === 'EVALUATED') {
          this.router.navigateByUrl(`/student/results/${attempt.id}`);
        }
      },
      error: () => {
        this.error.set('No se pudo cargar el intento.');
        this.loading.set(false);
      },
    });
  }

  prepareAnswers(attempt: any) {
    for (const question of attempt.exam.questions) {
      if (this.answers[question.id]) continue;

      if (question.type === 'MULTIPLE_SELECT') {
        this.answers[question.id] = { values: [] };
      } else if (question.type === 'MATCHING') {
        const pairs: Record<string, string> = {};

        for (const left of question.options?.left || []) {
          pairs[left.id] = '';
        }

        this.answers[question.id] = { pairs };
      } else if (question.type === 'ORDERING') {
        this.answers[question.id] = {
          order: [...(question.options?.options || [])].map(
            (item: any) => item.id
          ),
        };
      } else if (
        question.type === 'OPEN_TEXT' ||
        question.type === 'CASE_ANALYSIS'
      ) {
        this.answers[question.id] = { text: '' };
      } else {
        this.answers[question.id] = { value: '' };
      }
    }
  }

  setBooleanAnswer(questionId: string, value: boolean) {
    this.answers[questionId].value = value;
  }

  toggleMultiple(questionId: string, optionId: string, checked: boolean) {
    const current = this.answers[questionId]?.values || [];

    if (checked) {
      this.answers[questionId].values = [...new Set([...current, optionId])];
      return;
    }

    this.answers[questionId].values = current.filter(
      (value: string) => value !== optionId
    );
  }

  moveOrder(questionId: string, index: number, direction: 'up' | 'down') {
    const order = this.answers[questionId].order as string[];
    const nextIndex = direction === 'up' ? index - 1 : index + 1;

    if (nextIndex < 0 || nextIndex >= order.length) return;

    const copy = [...order];
    const temp = copy[index];

    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;

    this.answers[questionId].order = copy;
  }

  optionText(question: any, optionId: string) {
    const option = question.options?.options?.find(
      (item: any) => item.id === optionId
    );

    return option?.text || optionId;
  }

  submit() {
    const ok = confirm(
      '¿Enviar evaluación?\n\nDespués de enviar, no podrás modificar tus respuestas.'
    );

    if (!ok) return;

    this.error.set('');
    this.submitting.set(true);

    const answers = Object.entries(this.answers).map(
      ([questionId, response]) => ({
        questionId,
        response,
      })
    );

    this.api.submitAttempt(this.attemptId, answers).subscribe({
      next: (result: any) => {
        this.router.navigateByUrl(`/student/results/${result.id}`);
      },
      error: (error: any) => {
        this.submitting.set(false);
        this.error.set(
          error?.error?.message || 'No se pudo enviar la evaluación.'
        );
      },
    });
  }
}
