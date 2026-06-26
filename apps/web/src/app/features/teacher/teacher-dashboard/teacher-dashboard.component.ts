import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { TeacherExam } from '../../../core/api/api.types';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.scss',
})
export class TeacherDashboardComponent implements OnInit {
  exams = signal<TeacherExam[]>([]);
  loading = signal(true);

  constructor(
    public readonly auth: AuthService,
    private readonly api: ApiService
  ) {}

  ngOnInit() {
    this.api.getTeacherExams().subscribe({
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
