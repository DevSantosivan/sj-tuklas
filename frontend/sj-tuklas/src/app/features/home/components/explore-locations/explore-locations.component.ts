import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-explore-locations',
  imports: [RouterLink],
  templateUrl: './explore-locations.component.html',
  styleUrl: './explore-locations.component.scss',
})
export class ExploreLocationsComponent {
  locations = [
    {
      name: 'Poblacion',
      slug: 'poblacion',
      businesses: 64,
    },
    {
      name: 'Central San Jose',
      slug: 'central-san-jose',
      businesses: 48,
    },
    {
      name: 'Nearby Areas',
      slug: 'nearby',
      businesses: 32,
    },
  ];
}
