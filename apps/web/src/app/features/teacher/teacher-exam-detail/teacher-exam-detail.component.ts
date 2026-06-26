import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';

@Component({
  selector: 'app-teacher-exam-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  templateUrl: './teacher-exam-detail.component.html',
  styleUrl: './teacher-exam-detail.component.scss',
})
export class TeacherExamDetailComponent implements OnInit {
  examId = '';
  summary = signal<any | null>(null);
  attempts = signal<any[]>([]);
  analytics = signal<any | null>(null);
  actionMessage = signal('');
  actionError = signal('');
  busyAttemptId = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('examId') || '';
    this.loadData();
  }

  loadData() {
    this.api.getTeacherExamSummary(this.examId).subscribe((summary) => {
      this.summary.set(summary);
    });

    this.api.getTeacherExamAttempts(this.examId).subscribe((attempts) => {
      this.attempts.set(attempts);
    });

    this.api.getTeacherExamAnalytics(this.examId).subscribe((analytics) => {
      this.analytics.set(analytics);
    });
  }

  authorizeRetry(attempt: any) {
    const ok = confirm(
      `¿Dar nueva oportunidad a ${attempt.fullName}?\n\nEsto conservará su intento anterior y permitirá que presente nuevamente.`
    );

    if (!ok) return;

    this.actionMessage.set('');
    this.actionError.set('');
    this.busyAttemptId.set(attempt.id);

    this.api.authorizeTeacherRetry(attempt.id).subscribe({
      next: (response) => {
        this.actionMessage.set(response.message || 'Nueva oportunidad autorizada.');
        this.busyAttemptId.set(null);
        this.loadData();
      },
      error: () => {
        this.actionError.set('No se pudo autorizar la nueva oportunidad.');
        this.busyAttemptId.set(null);
      },
    });
  }

  resetAttempt(attempt: any) {
    const ok = confirm(
      `¿Resetear intento de ${attempt.fullName}?\n\nEsto eliminará el intento y sus respuestas. Úsalo solo en pruebas o errores administrativos.`
    );

    if (!ok) return;

    this.actionMessage.set('');
    this.actionError.set('');
    this.busyAttemptId.set(attempt.id);

    this.api.resetTeacherAttempt(attempt.id).subscribe({
      next: (response) => {
        this.actionMessage.set(response.message || 'Intento reseteado.');
        this.busyAttemptId.set(null);
        this.loadData();
      },
      error: () => {
        this.actionError.set('No se pudo resetear el intento.');
        this.busyAttemptId.set(null);
      },
    });
  }
}
