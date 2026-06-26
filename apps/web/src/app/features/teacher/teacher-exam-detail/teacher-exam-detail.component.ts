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

  downloadAttemptPdf(attemptId: string) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      this.actionError.set('No hay sesión activa.');
      return;
    }

    fetch(this.api.getTeacherAttemptPdfUrl(attemptId), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('No se pudo descargar el PDF.');
        }

        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `evidencia-examen-${attemptId}.pdf`;
        link.click();

        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        this.actionError.set('No se pudo descargar el PDF del intento.');
      });
  }

}
