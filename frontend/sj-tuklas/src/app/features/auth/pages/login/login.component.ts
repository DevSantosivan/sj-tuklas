import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  email = '';
  password = '';

  showPassword = false;
  errorMessage = '';
  isLoading = false;

  // =========================================================
  // LOGIN
  // =========================================================

  async onLogin(): Promise<void> {
    this.errorMessage = '';

    const email = this.email.trim();
    const password = this.password;

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!email || !password) {
      this.errorMessage = 'Please enter your email and password.';

      return;
    }

    this.isLoading = true;

    try {
      const response = await this.authService.signIn(email, password);

      const role = response.user.role;

      // -------------------------------------------------------
      // ADMIN
      // -------------------------------------------------------

      if (role === 'admin') {
        await this.router.navigate(['/admin/approvals']);

        return;
      }

      // -------------------------------------------------------
      // BUSINESS OWNER
      // -------------------------------------------------------

      if (role === 'business_owner') {
        await this.router.navigate(['/business/dashboard']);

        return;
      }

      // -------------------------------------------------------
      // VISITOR
      // -------------------------------------------------------

      if (role === 'visitor') {
        await this.router.navigate(['/']);

        return;
      }

      // -------------------------------------------------------
      // INVALID ROLE
      // -------------------------------------------------------

      this.errorMessage = 'Your account role is not configured correctly.';
    } catch (error: any) {
      console.error('Login failed:', error);

      this.errorMessage = error?.error?.message || 'Invalid email or password.';
    } finally {
      this.isLoading = false;
    }
  }
}
