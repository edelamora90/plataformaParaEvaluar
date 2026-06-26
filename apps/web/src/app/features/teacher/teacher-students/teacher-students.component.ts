import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { TeacherStudent } from '../../../core/api/api.types';

@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/teacher/dashboard">← Volver</a>
      <h1>Alumnos registrados</h1>

      <section class="panel">
        <table>
          <thead>
            <tr>
              <th>No. control</th>
              <th>Nombre</th>
              <th>Grupo</th>
              <th>Estado</th>
              <th>Intentos</th>
            </tr>
          </thead>
          <tbody>
            @for (student of students(); track student.id) {
              <tr>
                <td>{{ student.controlNumber }}</td>
                <td>{{ student.fullName }}</td>
                <td>{{ student.group }}</td>
                <td>{{ student.isActive ? 'Activo' : 'Inactivo' }}</td>
                <td>{{ student.attempts.length }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </main>
  `,
  styles: [`
    .page { min-height: 100vh; padding: 32px; background:#f8fafc; color:#0f172a; }
    a { color:#2563eb; text-decoration:none; font-weight:800; }
    .panel { background:white; border:1px solid #e2e8f0; border-radius:24px; padding:20px; overflow:auto; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:14px; border-bottom:1px solid #e2e8f0; text-align:left; }
    th { color:#475569; font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
  `],
})
export class TeacherStudentsComponent implements OnInit {
  students = signal<TeacherStudent[]>([]);

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.getTeacherStudents().subscribe((students) => this.students.set(students));
  }
}
