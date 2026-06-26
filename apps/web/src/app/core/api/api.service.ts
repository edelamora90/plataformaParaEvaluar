import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AvailableExam,
  LoginResponse,
  TeacherExam,
  TeacherStudent,
} from './api.types';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  login(identifier: string, password: string) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      identifier,
      password,
    });
  }

  me() {
    return this.http.get<LoginResponse['user']>(`${this.apiUrl}/auth/me`);
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch<{ ok: boolean; message: string }>(
      `${this.apiUrl}/auth/change-password`,
      {
        currentPassword,
        newPassword,
      }
    );
  }

  getAvailableExams() {
    return this.http.get<AvailableExam[]>(
      `${this.apiUrl}/exams/student/available`
    );
  }

  startAttempt(examId: string, accessCode: string) {
    return this.http.post<any>(`${this.apiUrl}/attempts/start`, {
      examId,
      accessCode,
    });
  }

  getAttempt(attemptId: string) {
    return this.http.get<any>(`${this.apiUrl}/attempts/${attemptId}`);
  }

  submitAttempt(attemptId: string, answers: any[]) {
    return this.http.post<any>(`${this.apiUrl}/attempts/${attemptId}/submit`, {
      answers,
    });
  }

  getTeacherExams() {
    return this.http.get<TeacherExam[]>(`${this.apiUrl}/teacher/exams`);
  }

  getTeacherStudents() {
    return this.http.get<TeacherStudent[]>(`${this.apiUrl}/teacher/students`);
  }

  getTeacherExamSummary(examId: string) {
    return this.http.get<any>(`${this.apiUrl}/teacher/exams/${examId}/summary`);
  }

  getTeacherExamAttempts(examId: string) {
    return this.http.get<any[]>(
      `${this.apiUrl}/teacher/exams/${examId}/attempts`
    );
  }

  getTeacherExamAnalytics(examId: string) {
    return this.http.get<any>(
      `${this.apiUrl}/teacher/exams/${examId}/analytics`
    );
  }

  getTeacherAttemptDetail(attemptId: string) {
    return this.http.get<any>(`${this.apiUrl}/teacher/attempts/${attemptId}`);
  }

  resetTeacherAttempt(attemptId: string) {
    return this.http.delete<any>(
      `${this.apiUrl}/teacher/attempts/${attemptId}/reset`
    );
  }

  authorizeTeacherRetry(attemptId: string) {
    return this.http.post<any>(
      `${this.apiUrl}/teacher/attempts/${attemptId}/retry`,
      {}
    );
  }
}
