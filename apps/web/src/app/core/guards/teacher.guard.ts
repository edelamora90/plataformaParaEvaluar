import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const teacherGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
    return true;
  }

  router.navigateByUrl('/student/dashboard');
  return false;
};
