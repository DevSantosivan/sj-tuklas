import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-business-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './business-register.component.html',
  styleUrl: './business-register.component.scss',
})
export class BusinessRegisterComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // =====================================================
  // ACCOUNT
  // =====================================================

  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  agreedToTerms = false;

  // =====================================================
  // UI STATE
  // =====================================================

  showPassword = false;
  showConfirmPassword = false;

  isLoading = false;

  errorMessage = '';
  successMessage = '';

  // =====================================================
  // CONTINUE
  // =====================================================

  async onContinue(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isLoading) {
      return;
    }

    // ===================================================
    // REQUIRED FIELDS
    // ===================================================

    if (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.phone.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage = 'Please complete all required fields.';

      return;
    }

    // ===================================================
    // FULL NAME
    // ===================================================

    const normalizedName = this.fullName.trim();

    if (normalizedName.length < 2) {
      this.errorMessage = 'Please enter your full name.';

      return;
    }

    if (normalizedName.length > 100) {
      this.errorMessage = 'Full name is too long.';

      return;
    }

    // ===================================================
    // EMAIL
    // ===================================================

    const normalizedEmail = this.email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      this.errorMessage = 'Please enter a valid email address.';

      return;
    }

    // ===================================================
    // PHONE
    // ===================================================

    const normalizedPhone = this.phone.trim();

    if (normalizedPhone.length < 7) {
      this.errorMessage = 'Please enter a valid phone number.';

      return;
    }

    if (normalizedPhone.length > 30) {
      this.errorMessage = 'Phone number is too long.';

      return;
    }

    // ===================================================
    // PASSWORD
    // ===================================================

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';

      return;
    }

    if (this.password.length > 128) {
      this.errorMessage = 'Password is too long.';

      return;
    }

    // ===================================================
    // CONFIRM PASSWORD
    // ===================================================

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';

      return;
    }

    // ===================================================
    // TERMS
    // ===================================================

    if (!this.agreedToTerms) {
      this.errorMessage =
        'Please agree to the Terms of Service and Privacy Policy.';

      return;
    }

    // ===================================================
    // START REQUEST
    // ===================================================

    this.isLoading = true;

    try {
      // =================================================
      // CREATE BUSINESS OWNER ACCOUNT
      // =================================================

      const result = await this.authService.signUp(
        normalizedEmail,
        this.password,
        normalizedName,
        'business_owner',
        normalizedPhone,
      );

      // =================================================
      // VERIFY USER
      // =================================================

      if (!result.user?.id) {
        this.errorMessage = 'Account registration failed.';

        return;
      }

      const userId = result.user.id;

      // =================================================
      // SUCCESS
      // =================================================

      this.successMessage =
        'Your business owner account has been created successfully.';

      // =================================================
      // CONTINUE TO BUSINESS SETUP
      // =================================================

      await this.router.navigate(['/business/create', userId]);
    } catch (error: unknown) {
      console.error('BUSINESS REGISTER ERROR:', error);

      this.errorMessage = this.getAuthErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // ERROR HANDLER
  // =====================================================

  private getAuthErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const apiError = error as {
        status?: number;

        error?: {
          message?: string;
          error?: string;
          msg?: string;
        };

        message?: string;
      };

      const apiMessage =
        apiError.error?.message ||
        apiError.error?.error ||
        apiError.error?.msg ||
        apiError.message;

      if (apiMessage) {
        const message = apiMessage.toLowerCase();

        if (
          message.includes('user already registered') ||
          message.includes('already registered') ||
          message.includes('already been registered')
        ) {
          return 'An account with this email already exists.';
        }

        if (message.includes('invalid email')) {
          return 'Please enter a valid email address.';
        }

        if (message.includes('password') && message.includes('6')) {
          return 'Password must be at least 6 characters.';
        }

        if (message.includes('rate limit')) {
          return 'Too many registration attempts. Please wait a moment and try again.';
        }

        if (message.includes('signup is disabled')) {
          return 'New account registration is currently unavailable.';
        }

        return apiMessage;
      }

      if (apiError.status === 400) {
        return 'Registration request was rejected. Please check your information or use a different email.';
      }
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('network')) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }

      return error.message;
    }

    return 'Something went wrong while creating your account.';
  }
}
