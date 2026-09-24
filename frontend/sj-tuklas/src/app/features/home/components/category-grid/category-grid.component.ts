import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Category {
  icon: string;
  name: string;
  count: number;
  slug: string;
}

@Component({
  selector: 'app-category-grid',
  imports: [RouterLink],
  templateUrl: './category-grid.component.html',
  styleUrl: './category-grid.component.scss',
})
export class CategoryGridComponent {
  categories: Category[] = [
    {
      icon: 'bx bx-restaurant',
      name: 'Foods & Drinks',
      count: 42,
      slug: 'restaurants',
    },
    {
      icon: 'bx bx-store',
      name: 'Shops',
      count: 56,
      slug: 'shops',
    },
    {
      icon: 'bx bx-wrench',
      name: 'Services',
      count: 38,
      slug: 'services',
    },
    {
      icon: 'bx bx-hotel',
      name: 'Hotels',
      count: 18,
      slug: 'hotels',
    },
    {
      icon: 'bx bx-home',
      name: 'Boarding Houses',
      count: 24,
      slug: 'boarding-houses',
    },
    {
      icon: 'bx bx-map-pin',
      name: 'Places',
      count: 15,
      slug: 'places',
    },
  ];
}
