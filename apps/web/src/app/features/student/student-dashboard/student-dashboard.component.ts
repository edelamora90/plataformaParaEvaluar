import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { AvailableExam } from '../../../core/api/api.types';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
})
export class StudentDashboardComponent implements OnInit {
  exams = signal<AvailableExam[]>([]);
  loading = signal(true);

  constructor(
    public readonly auth: AuthService,
    private readonly api: ApiService
  ) {}

  ngOnInit() {
    this.loadExams();
  }

  loadExams() {
    this.api.getAvailableExams().subscribe({
      next: (exams) => {
        this.exams.set(exams);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  logout() {
    this.auth.logout();
  }
}
