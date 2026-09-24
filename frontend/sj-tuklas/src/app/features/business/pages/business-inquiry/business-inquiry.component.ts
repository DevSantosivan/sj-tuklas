import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';

@Component({
  selector: 'app-business-inquiry',
  imports: [RouterLink, FormsModule],
  templateUrl: './business-inquiry.component.html',
  styleUrl: './business-inquiry.component.scss',
})
export class BusinessInquiryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly businessService = inject(BusinessService);

  business = signal<Business | null>(null);
  loading = signal(true);

  subject = signal('');
  message = signal('');

  isSubmitting = signal(false);
  submitted = signal(false);

  constructor() {
    this.loadBusiness();
  }

  async loadBusiness(): Promise<void> {
    const businessId = this.route.snapshot.paramMap.get('id');

    if (!businessId) {
      this.loading.set(false);
      return;
    }

    try {
      const business = await this.businessService.getBusinessById(businessId);

      this.business.set(business);
    } catch (error) {
      console.error('Failed to load business:', error);
      this.business.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  onSubjectChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.subject.set(input.value);
  }

  onMessageChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;

    this.message.set(textarea.value);
  }

  submitInquiry(): void {
    const subject = this.subject().trim();
    const message = this.message().trim();

    if (!subject || !message) {
      return;
    }

    this.isSubmitting.set(true);

    // Temporary UI simulation.
    // Supabase inquiry submission can be added later.
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.submitted.set(true);
    }, 800);
  }

  makeAnotherInquiry(): void {
    this.subject.set('');
    this.message.set('');
    this.submitted.set(false);
  }
}
