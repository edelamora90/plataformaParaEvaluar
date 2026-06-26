import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';

@Component({
  selector: 'app-student-exam-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-exam-start.component.html',
  styleUrl: './student-exam-start.component.scss',
})
export class StudentExamStartComponent implements OnInit {
  examId = '';
  accessCode = 'IA2026';

  loading = signal(false);
  error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService
  ) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('examId') || '';
  }

  start() {
    this.error.set('');
    this.loading.set(true);

    this.api.startAttempt(this.examId, this.accessCode.trim()).subscribe({
      next: (attempt: any) => {
        this.router.navigateByUrl(`/student/attempts/${attempt.id}`);
      },
      error: (error: any) => {
        this.loading.set(false);
        this.error.set(
          error?.error?.message ||
            'No se pudo iniciar la evaluación. Verifica el código o si ya tienes un intento registrado.'
        );
      },
    });
  }
}
