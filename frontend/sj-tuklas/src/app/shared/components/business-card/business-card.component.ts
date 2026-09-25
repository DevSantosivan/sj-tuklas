import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Business } from '../../../core/models/business';

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './business-card.component.html',
  styleUrl: './business-card.component.scss',
})
export class BusinessCardComponent {
  readonly business = input.required<Business>();

  readonly variant = input<'card' | 'list'>('card');

  readonly imageError = signal(false);

  onImageError(): void {
    this.imageError.set(true);
  }
}
