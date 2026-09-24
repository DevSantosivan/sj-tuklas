import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-success-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './success-state.component.html',
  styleUrl: './success-state.component.scss',
})
export class SuccessStateComponent {
  readonly eyebrow = input('SUCCESS');

  readonly icon = input('bx-check');

  readonly title = input('Success!');

  readonly message = input('Your request has been completed successfully.');

  readonly primaryLabel = input('Continue');

  readonly primaryRoute = input<string | null>(null);

  readonly secondaryLabel = input<string | null>(null);

  readonly showSecondary = input(true);

  readonly primaryAction = output<void>();

  readonly secondaryAction = output<void>();

  onPrimaryClick(): void {
    this.primaryAction.emit();
  }

  onSecondaryClick(): void {
    this.secondaryAction.emit();
  }
}
