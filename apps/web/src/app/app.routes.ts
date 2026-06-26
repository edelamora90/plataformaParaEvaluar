import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { studentGuard } from './core/guards/student.guard';
import { teacherGuard } from './core/guards/teacher.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { StudentAttemptComponent } from './features/student/student-attempt/student-attempt.component';
import { StudentDashboardComponent } from './features/student/student-dashboard/student-dashboard.component';
import { StudentExamStartComponent } from './features/student/student-exam-start/student-exam-start.component';
import { StudentResultComponent } from './features/student/student-result/student-result.component';
import { TeacherDashboardComponent } from './features/teacher/teacher-dashboard/teacher-dashboard.component';
import { TeacherExamDetailComponent } from './features/teacher/teacher-exam-detail/teacher-exam-detail.component';
import { TeacherStudentsComponent } from './features/teacher/teacher-students/teacher-students.component';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'student/dashboard',
    component: StudentDashboardComponent,
    canActivate: [authGuard, studentGuard],
  },
  {
    path: 'student/exams/:examId/start',
    component: StudentExamStartComponent,
    canActivate: [authGuard, studentGuard],
  },
  {
    path: 'student/attempts/:attemptId',
    component: StudentAttemptComponent,
    canActivate: [authGuard, studentGuard],
  },
  {
    path: 'student/results/:attemptId',
    component: StudentResultComponent,
    canActivate: [authGuard, studentGuard],
  },
  {
    path: 'teacher/dashboard',
    component: TeacherDashboardComponent,
    canActivate: [authGuard, teacherGuard],
  },
  {
    path: 'teacher/students',
    component: TeacherStudentsComponent,
    canActivate: [authGuard, teacherGuard],
  },
  {
    path: 'teacher/exams/:examId',
    component: TeacherExamDetailComponent,
    canActivate: [authGuard, teacherGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
