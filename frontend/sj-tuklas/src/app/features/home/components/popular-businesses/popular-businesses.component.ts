import { Component } from '@angular/core';

import { BusinessCardComponent } from '../../../../shared/components/business-card/business-card.component';
import { BUSINESSES } from '../../../../core/data/business.data';

@Component({
  selector: 'app-popular-businesses',
  imports: [BusinessCardComponent],
  templateUrl: './popular-businesses.component.html',
  styleUrl: './popular-businesses.component.scss',
})
export class PopularBusinessesComponent {
  businesses = BUSINESSES.slice(0, 4);
}
