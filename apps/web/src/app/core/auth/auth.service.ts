import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser } from '../api/api.types';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'clase_ia_access_token';
  private readonly userKey = 'clase_ia_user';

  readonly user = signal<AuthUser | null>(this.loadUser());

  constructor(
    private readonly api: ApiService,
    private readonly router: Router
  ) {}

  login(identifier: string, password: string) {
    return this.api.login(identifier, password);
  }

  saveSession(accessToken: string, user: AuthUser) {
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.user.set(user);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  redirectByRole() {
    const user = this.user();

    if (!user) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      this.router.navigateByUrl('/teacher/dashboard');
      return;
    }

    this.router.navigateByUrl('/student/dashboard');
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
}
