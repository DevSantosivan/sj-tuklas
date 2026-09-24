import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { Business } from '../../../../../core/models/business';
import { AuthUser } from '../../../../../core/models/auth.model';

import { BusinessService } from '../../../../../core/services/business.service';
import { AuthService } from '../../../../../core/services/auth.service';

import { BusinessMapComponent } from '../../../../../shared/components/business-map/business-map.component';

@Component({
  selector: 'app-approval-details',
  standalone: true,

  imports: [CommonModule, BusinessMapComponent],

  templateUrl: './approval-details.component.html',
  styleUrl: './approval-details.component.scss',
})
export class ApprovalDetailsComponent implements OnInit {
  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly businessService = inject(BusinessService);

  private readonly authService = inject(AuthService);

  // =========================================================
  // STATE
  // =========================================================

  readonly business = signal<Business | null>(null);

  readonly owner = signal<AuthUser | null>(null);

  readonly isLoading = signal<boolean>(true);

  readonly errorMessage = signal<string | null>(null);

  readonly isProcessing = signal<boolean>(false);

  readonly actionType = signal<'approve' | 'reject' | null>(null);

  readonly actionMessage = signal<string | null>(null);

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    void this.loadBusiness();
  }

  // =========================================================
  // LOAD BUSINESS
  //
  // IMPORTANT:
  // This is ADMIN.
  //
  // Do NOT use:
  // getBusinessById()
  //
  // because public getBusinessById()
  // only returns APPROVED businesses.
  //
  // Admin must be able to view:
  // - pending
  // - approved
  // - rejected
  // =========================================================

  async loadBusiness(): Promise<void> {
    this.isLoading.set(true);

    this.errorMessage.set(null);

    this.actionMessage.set(null);

    this.owner.set(null);

    const businessId = this.route.snapshot.paramMap.get('id');

    if (!businessId) {
      this.errorMessage.set('Business application ID was not provided.');

      this.isLoading.set(false);

      return;
    }

    try {
      const result =
        await this.businessService.getAdminBusinessById(businessId);

      if (!result) {
        this.business.set(null);

        this.errorMessage.set('Business application was not found.');

        return;
      }

      this.business.set(result);

      // =====================================================
      // LOAD BUSINESS OWNER
      // =====================================================

      if (result.ownerId) {
        try {
          const owner = await this.authService.getUserById(result.ownerId);

          this.owner.set(owner);
        } catch (ownerError) {
          console.error('Failed to load business owner:', ownerError);

          // Hindi natin ibe-break
          // ang business details kapag
          // hindi ma-load ang owner.
          this.owner.set(null);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to load business application:', error);

      this.business.set(null);

      this.errorMessage.set(
        this.getErrorMessage(error, 'Failed to load the business application.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // =========================================================
  // STATUS
  // =========================================================

  isPending(): boolean {
    return this.business()?.status?.toLowerCase().trim() === 'pending';
  }

  // =========================================================
  // APPROVE
  // =========================================================

  async approveBusiness(): Promise<void> {
    const business = this.business();

    if (!business?.id) {
      return;
    }

    if (this.isProcessing()) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to approve "${business.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.isProcessing.set(true);

    this.actionType.set('approve');

    this.actionMessage.set(null);

    this.errorMessage.set(null);

    try {
      const updated = await this.businessService.updateBusinessStatus(
        business.id,
        'approved',
      );

      this.business.set(updated);

      this.actionMessage.set('Business application approved successfully.');
    } catch (error: unknown) {
      console.error('Failed to approve business:', error);

      this.errorMessage.set(
        this.getErrorMessage(
          error,
          'Failed to approve the business application.',
        ),
      );
    } finally {
      this.isProcessing.set(false);

      this.actionType.set(null);
    }
  }

  // =========================================================
  // REJECT
  // =========================================================

  async rejectBusiness(): Promise<void> {
    const business = this.business();

    if (!business?.id) {
      return;
    }

    if (this.isProcessing()) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reject "${business.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.isProcessing.set(true);

    this.actionType.set('reject');

    this.actionMessage.set(null);

    this.errorMessage.set(null);

    try {
      const updated = await this.businessService.updateBusinessStatus(
        business.id,
        'rejected',
      );

      this.business.set(updated);

      this.actionMessage.set('Business application rejected successfully.');
    } catch (error: unknown) {
      console.error('Failed to reject business:', error);

      this.errorMessage.set(
        this.getErrorMessage(
          error,
          'Failed to reject the business application.',
        ),
      );
    } finally {
      this.isProcessing.set(false);

      this.actionType.set(null);
    }
  }

  // =========================================================
  // BACK
  // =========================================================

  goBack(): void {
    void this.router.navigate(['/admin/approvals']);
  }

  // =========================================================
  // ERROR
  // =========================================================

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const response = error as {
        error?: {
          message?: string;
        };
        message?: string;
      };

      if (response.error?.message) {
        return response.error.message;
      }

      if (response.message) {
        return response.message;
      }
    }

    return fallback;
  }
}
