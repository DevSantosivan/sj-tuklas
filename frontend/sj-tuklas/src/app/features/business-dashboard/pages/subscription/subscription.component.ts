import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-subscription',
  imports: [RouterLink],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
})
export class SubscriptionComponent {
  billingPeriod: 'monthly' | 'yearly' = 'monthly';

  constructor(private router: Router) {}

  continueWithFree(): void {
    // Temporary navigation.
    // Later, this will save the selected plan to the database.
    this.router.navigate(['/']);
  }

  upgradeToPro(): void {
    // Temporary navigation.
    // Later, this should go to your payment/checkout page.
    console.log('Upgrade to Pro');
  }
}
