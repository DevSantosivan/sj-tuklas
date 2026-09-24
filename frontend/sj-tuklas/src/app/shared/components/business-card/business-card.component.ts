import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Business } from '../../../core/models/business';

@Component({
  selector: 'app-business-card',
  imports: [RouterLink],
  templateUrl: './business-card.component.html',
  styleUrl: './business-card.component.scss',
})
export class BusinessCardComponent {
  business = input.required<Business>();

  imageError = signal(false);

  onImageError(): void {
    this.imageError.set(true);
  }
}
