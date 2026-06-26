import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  identifier = '';
  password = '';

  loading = signal(false);
  error = signal('');

  constructor(private readonly auth: AuthService) {}

  submit() {
    this.error.set('');

    if (!this.identifier.trim() || !this.password.trim()) {
      this.error.set('Ingresa usuario y contraseña.');
      return;
    }

    this.loading.set(true);

    this.auth.login(this.identifier.trim(), this.password).subscribe({
      next: (response) => {
        this.auth.saveSession(response.accessToken, response.user);
        this.auth.redirectByRole();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Credenciales inválidas.');
      },
    });
  }
}
