import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Business } from '../../../../core/models/business';
import { BusinessService } from '../../../../core/services/business.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalsComponent implements OnInit {
  private readonly businessService = inject(BusinessService);
  private readonly router = inject(Router);

  readonly businesses = signal<Business[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly actionBusinessId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly pendingBusinesses = computed(() =>
    this.businesses().filter(
      (business) => business.status?.toLowerCase().trim() === 'pending',
    ),
  );

  readonly approvedCount = computed(
    () =>
      this.businesses().filter(
        (business) => business.status?.toLowerCase().trim() === 'approved',
      ).length,
  );

  readonly rejectedCount = computed(
    () =>
      this.businesses().filter(
        (business) => business.status?.toLowerCase().trim() === 'rejected',
      ).length,
  );

  readonly totalCount = computed(() => this.businesses().length);

  async ngOnInit(): Promise<void> {
    await this.loadBusinesses();
  }

  async loadBusinesses(): Promise<void> {
    this.errorMessage.set(null);

    try {
      const businesses = await this.businessService.getAdminBusinesses();

      this.businesses.set(businesses);

      console.log('ADMIN BUSINESSES:', businesses);
      console.log('PENDING BUSINESSES:', this.pendingBusinesses());
    } catch (error) {
      console.error('FAILED TO LOAD ADMIN BUSINESSES:', error);

      this.errorMessage.set('Failed to load business applications.');
    } finally {
      this.isLoading.set(false);
      this.isRefreshing.set(false);
    }
  }

  viewBusiness(business: any): void {
    if (!business?.id) {
      return;
    }

    this.router.navigate(['/admin/approvals', business.id]);
  }

  async refresh(): Promise<void> {
    if (this.isRefreshing()) {
      return;
    }

    this.isRefreshing.set(true);

    await this.loadBusinesses();
  }

  async approveBusiness(business: Business): Promise<void> {
    if (this.actionBusinessId()) {
      return;
    }

    const confirmed = window.confirm(`Approve "${business.name}"?`);

    if (!confirmed) {
      return;
    }

    this.actionBusinessId.set(business.id);
    this.errorMessage.set(null);

    try {
      const updatedBusiness = await this.businessService.updateBusinessStatus(
        business.id,
        'approved',
      );

      this.updateBusinessInList(updatedBusiness);

      console.log('BUSINESS APPROVED:', updatedBusiness);
    } catch (error) {
      console.error('FAILED TO APPROVE BUSINESS:', error);

      this.errorMessage.set(`Failed to approve ${business.name}.`);
    } finally {
      this.actionBusinessId.set(null);
    }
  }

  async rejectBusiness(business: Business): Promise<void> {
    if (this.actionBusinessId()) {
      return;
    }

    const confirmed = window.confirm(`Reject "${business.name}"?`);

    if (!confirmed) {
      return;
    }

    this.actionBusinessId.set(business.id);
    this.errorMessage.set(null);

    try {
      const updatedBusiness = await this.businessService.updateBusinessStatus(
        business.id,
        'rejected',
      );

      this.updateBusinessInList(updatedBusiness);

      console.log('BUSINESS REJECTED:', updatedBusiness);
    } catch (error) {
      console.error('FAILED TO REJECT BUSINESS:', error);

      this.errorMessage.set(`Failed to reject ${business.name}.`);
    } finally {
      this.actionBusinessId.set(null);
    }
  }

  private updateBusinessInList(updatedBusiness: Business): void {
    this.businesses.update((businesses) =>
      businesses.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business,
      ),
    );
  }

  isProcessing(businessId: string): boolean {
    return this.actionBusinessId() === businessId;
  }
}
