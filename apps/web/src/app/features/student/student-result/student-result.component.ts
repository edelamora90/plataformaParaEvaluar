import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';

@Component({
  selector: 'app-student-result',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  templateUrl: './student-result.component.html',
  styleUrl: './student-result.component.scss',
})
export class StudentResultComponent implements OnInit {
  attemptId = '';
  result = signal<any | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {}

  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId') || '';

    this.api.getAttempt(this.attemptId).subscribe({
      next: (result: any) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el resultado.');
        this.loading.set(false);
      },
    });
  }
}
