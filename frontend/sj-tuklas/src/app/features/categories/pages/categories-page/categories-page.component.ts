import { Component, computed, signal } from '@angular/core';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';

interface BusinessType {
  name: string;
  features: string[];
}

interface BusinessCategory {
  name: string;
  icon: string;
  description: string;
  types: BusinessType[];
}

@Component({
  selector: 'app-categories-page',
  imports: [SearchBarComponent],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
})
export class CategoriesPageComponent {
  searchTerm = signal('');
  activeCategory = signal('all');

  categories: BusinessCategory[] = [
    // =========================================================
    // FOODS & DRINKS
    // =========================================================
    {
      name: 'Foods & Drinks',
      icon: 'bx bx-restaurant',
      description:
        'Restaurants, cafés, food shops, and other businesses that serve food and drinks.',
      types: [
        {
          name: 'Restaurant',
          features: [
            'Menu',
            'Ordering',
            'Reservations',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Fast Food',
          features: [
            'Menu',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Silogan',
          features: [
            'Menu',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Café',
          features: [
            'Menu',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Bakery',
          features: [
            'Menu',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Dessert Shop',
          features: [
            'Menu',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Food Stall',
          features: [
            'Menu',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Catering',
          features: [
            'Menu',
            'Booking / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Bar / Grill',
          features: [
            'Menu',
            'Ordering',
            'Reservations',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
      ],
    },

    // =========================================================
    // SHOPS
    // =========================================================
    {
      name: 'Shops',
      icon: 'bx bx-store',
      description:
        'Retail stores, specialty shops, and local merchants offering products to customers.',
      types: [
        {
          name: 'Clothing Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Grocery Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Convenience Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Electronics Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Computer Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Hardware Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Pharmacy / Drugstore',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Beauty & Cosmetics',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Furniture Store',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Gift Shop',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'General Merchandise',
          features: [
            'Products',
            'Ordering',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
      ],
    },

    // =========================================================
    // SERVICES
    // =========================================================
    {
      name: 'Services',
      icon: 'bx bx-wrench',
      description:
        'Professional, personal, repair, and specialized services available in the local community.',
      types: [
        {
          name: 'Salon / Beauty',
          features: [
            'Services',
            'Booking',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Barbershop',
          features: [
            'Services',
            'Booking',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Spa / Massage',
          features: [
            'Services',
            'Booking',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Auto Repair',
          features: [
            'Services',
            'Booking / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Motorcycle Repair',
          features: [
            'Services',
            'Booking / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Laundry',
          features: [
            'Services',
            'Booking / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Printing & Digital Services',
          features: [
            'Services',
            'Order / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Computer / IT Services',
          features: [
            'Services',
            'Booking / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Photography',
          features: [
            'Services',
            'Booking',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Events & Entertainment',
          features: [
            'Services',
            'Booking',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Cleaning Services',
          features: [
            'Services',
            'Booking / Request',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Construction / Contractor',
          features: [
            'Services',
            'Request a Quote',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Tutorial / Training',
          features: [
            'Services / Programs',
            'Booking / Enrollment',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
      ],
    },

    // =========================================================
    // HOTELS
    // =========================================================
    {
      name: 'Hotels',
      icon: 'bx bx-hotel',
      description:
        'Hotels and accommodation businesses where customers can explore rooms, amenities, and booking options.',
      types: [
        {
          name: 'Hotel',
          features: [
            'Rooms',
            'Booking',
            'Services & Amenities',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Resort',
          features: [
            'Rooms',
            'Booking',
            'Services & Amenities',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Inn',
          features: [
            'Rooms',
            'Booking',
            'Services & Amenities',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Lodge',
          features: [
            'Rooms',
            'Booking',
            'Services & Amenities',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Apartelle',
          features: [
            'Rooms / Units',
            'Booking',
            'Services & Amenities',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Bed & Breakfast',
          features: [
            'Rooms',
            'Booking',
            'Services & Amenities',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
      ],
    },

    // =========================================================
    // BOARDING HOUSES
    // =========================================================
    {
      name: 'Boarding Houses',
      icon: 'bx bx-home',
      description:
        'Boarding houses, dormitories, bedspaces, and rental properties for people looking for a place to stay.',
      types: [
        {
          name: 'Boarding House',
          features: [
            'Rooms / Units',
            'Booking / Inquiry',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Dormitory',
          features: [
            'Rooms / Units',
            'Booking / Inquiry',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Bedspace',
          features: [
            'Rooms / Units',
            'Booking / Inquiry',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Apartment / Rental',
          features: [
            'Units',
            'Booking / Inquiry',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
        {
          name: 'Room for Rent',
          features: [
            'Rooms / Units',
            'Booking / Inquiry',
            'Promotions',
            'Inquiries',
            'Analytics',
          ],
        },
      ],
    },
  ];
  filteredCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.activeCategory();

    return this.categories
      .filter((item) => category === 'all' || item.name === category)
      .map((item) => {
        if (!term) {
          return item;
        }

        const matchingTypes = item.types.filter(
          (type) =>
            type.name.toLowerCase().includes(term) ||
            type.features.some((feature) =>
              feature.toLowerCase().includes(term),
            ),
        );

        return {
          ...item,
          types: matchingTypes,
        };
      })
      .filter((item) => item.types.length > 0);
  });

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }
}
