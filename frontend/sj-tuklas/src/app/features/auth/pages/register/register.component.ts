import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  agreedToTerms = false;

  showPassword = false;
  showConfirmPassword = false;

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  async onRegister(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    // =========================================================
    // VALIDATION
    // =========================================================

    if (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (!this.agreedToTerms) {
      this.errorMessage =
        'Please agree to the Terms of Service and Privacy Policy.';
      return;
    }

    // =========================================================
    // REGISTER
    // =========================================================

    this.isLoading = true;

    try {
      const response = await this.authService.signUp(
        this.email,
        this.password,
        this.fullName,

        // =====================================================
        // IMPORTANT:
        // Lahat ng account na ginagawa dito ay VISITOR.
        // Hindi business_owner.
        // =====================================================
        'visitor',

        // Optional phone
        undefined,
      );

      console.log('Visitor registration successful:', response);

      this.successMessage = 'Account created successfully!';

      // =========================================================
      // REDIRECT
      // =========================================================

      await this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Visitor registration error:', error);

      this.errorMessage =
        error?.error?.message ||
        error?.error?.error ||
        'Unable to create your account. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
