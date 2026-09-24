export interface BusinessFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface BusinessType {
  id: string;
  name: string;
  icon: string;
  features: BusinessFeature[];
}

export interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  types: BusinessType[];
}

const feature = (
  id: string,
  name: string,
  description: string,
  icon: string,
): BusinessFeature => ({
  id,
  name,
  description,
  icon,
});

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // =====================================================
  // FOODS & DRINKS
  // =====================================================

  {
    id: 'foods-drinks',
    name: 'Foods & Drinks',
    icon: 'bx-restaurant',
    description: 'Restaurants, food shops, cafés, and other food businesses.',
    types: [
      {
        id: 'restaurant',
        name: 'Restaurant',
        icon: 'bx-restaurant',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your food and drink menu.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place orders online.',
            'bx-cart',
          ),
          feature(
            'reservations',
            'Reservations',
            'Accept table reservation requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'fast-food',
        name: 'Fast Food',
        icon: 'bx-burger',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your food and drink menu.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'silogan',
        name: 'Silogan',
        icon: 'bx-bowl-rice',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your silog meals, drinks, and other items.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place food orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'cafe',
        name: 'Café',
        icon: 'bx-coffee',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your coffee, food, and beverage menu.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'bakery',
        name: 'Bakery',
        icon: 'bx-cookie',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your breads, pastries, and products.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers order your products online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'dessert-shop',
        name: 'Dessert Shop',
        icon: 'bx-cake',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your desserts and sweet products.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'food-stall',
        name: 'Food Stall',
        icon: 'bx-store',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your available food and drinks.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'catering',
        name: 'Catering',
        icon: 'bx-dish',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your catering packages and food options.',
            'bx-food-menu',
          ),
          feature(
            'booking-request',
            'Booking / Request',
            'Accept catering booking and service requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'bar-grill',
        name: 'Bar / Grill',
        icon: 'bx-beer',
        features: [
          feature(
            'menu',
            'Menu',
            'Show your food and beverage menu.',
            'bx-food-menu',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place orders online.',
            'bx-cart',
          ),
          feature(
            'reservations',
            'Reservations',
            'Accept reservation requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers, discounts, and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions and customer messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },
    ],
  },

  // =====================================================
  // SHOPS
  // =====================================================

  {
    id: 'shops',
    name: 'Shops',
    icon: 'bx-shopping-bag',
    description: 'Retail stores, groceries, merchandise, and specialty shops.',
    types: [
      {
        id: 'clothing-store',
        name: 'Clothing Store',
        icon: 'bx-t-shirt',
        features: [
          feature(
            'products',
            'Products',
            'Show your available clothing products.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'grocery-store',
        name: 'Grocery Store',
        icon: 'bx-cart',
        features: [
          feature(
            'products',
            'Products',
            'Show your available grocery products.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'convenience-store',
        name: 'Convenience Store',
        icon: 'bx-store',
        features: [
          feature(
            'products',
            'Products',
            'Show your available store products.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'electronics-store',
        name: 'Electronics Store',
        icon: 'bx-devices',
        features: [
          feature(
            'products',
            'Products',
            'Show your electronics and devices.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'computer-store',
        name: 'Computer Store',
        icon: 'bx-desktop',
        features: [
          feature(
            'products',
            'Products',
            'Show computers, parts, and accessories.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'hardware-store',
        name: 'Hardware Store',
        icon: 'bx-wrench',
        features: [
          feature(
            'products',
            'Products',
            'Show hardware and construction products.',
            'bx-package',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'pharmacy-drugstore',
        name: 'Pharmacy / Drugstore',
        icon: 'bx-plus-medical',
        features: [
          feature(
            'products',
            'Products',
            'Show available products and over-the-counter items.',
            'bx-package',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share available offers and deals.',
            'bx-purchase-tag',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'beauty-cosmetics',
        name: 'Beauty & Cosmetics',
        icon: 'bx-spa',
        features: [
          feature(
            'products',
            'Products',
            'Show your beauty and cosmetic products.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'furniture-store',
        name: 'Furniture Store',
        icon: 'bx-cabinet',
        features: [
          feature(
            'products',
            'Products',
            'Show your furniture products.',
            'bx-package',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'gift-shop',
        name: 'Gift Shop',
        icon: 'bx-gift',
        features: [
          feature(
            'products',
            'Products',
            'Show your gifts and specialty products.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'general-merchandise',
        name: 'General Merchandise',
        icon: 'bx-shopping-bag',
        features: [
          feature(
            'products',
            'Products',
            'Show your available merchandise.',
            'bx-package',
          ),
          feature(
            'ordering',
            'Ordering',
            'Let customers place product orders online.',
            'bx-cart',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },
    ],
  },

  // =====================================================
  // SERVICES
  // =====================================================

  {
    id: 'services',
    name: 'Services',
    icon: 'bx-cog',
    description: 'Professional, personal, repair, and local service providers.',
    types: [
      {
        id: 'salon-beauty',
        name: 'Salon / Beauty',
        icon: 'bx-cut',
        features: [
          feature(
            'services',
            'Services',
            'Showcase the services you provide.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking',
            'Booking',
            'Accept customer appointment requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'barbershop',
        name: 'Barbershop',
        icon: 'bx-cut',
        features: [
          feature(
            'services',
            'Services',
            'Show your haircut and grooming services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking',
            'Booking',
            'Accept appointment requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'spa-massage',
        name: 'Spa / Massage',
        icon: 'bx-spa',
        features: [
          feature(
            'services',
            'Services',
            'Show your spa and massage services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking',
            'Booking',
            'Accept customer appointment requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'auto-repair',
        name: 'Auto Repair',
        icon: 'bx-car',
        features: [
          feature(
            'services',
            'Services',
            'Show your automotive repair services.',
            'bx-wrench',
          ),
          feature(
            'booking-request',
            'Booking / Request',
            'Accept repair and service requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'motorcycle-repair',
        name: 'Motorcycle Repair',
        icon: 'bx-cycling',
        features: [
          feature(
            'services',
            'Services',
            'Show your motorcycle repair services.',
            'bx-wrench',
          ),
          feature(
            'booking-request',
            'Booking / Request',
            'Accept repair and service requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'laundry',
        name: 'Laundry',
        icon: 'bx-washer',
        features: [
          feature(
            'services',
            'Services',
            'Show your laundry services and rates.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking-request',
            'Booking / Request',
            'Accept laundry service requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'printing-digital',
        name: 'Printing & Digital Services',
        icon: 'bx-printer',
        features: [
          feature(
            'services',
            'Services',
            'Show your printing and digital services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'order-request',
            'Order / Request',
            'Accept printing and service requests.',
            'bx-file',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'computer-it',
        name: 'Computer / IT Services',
        icon: 'bx-code-alt',
        features: [
          feature(
            'services',
            'Services',
            'Show your computer and IT services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking-request',
            'Booking / Request',
            'Accept technical service requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'photography',
        name: 'Photography',
        icon: 'bx-camera',
        features: [
          feature(
            'services',
            'Services',
            'Show your photography packages and services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking',
            'Booking',
            'Accept photography booking requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'events-entertainment',
        name: 'Events & Entertainment',
        icon: 'bx-party',
        features: [
          feature(
            'services',
            'Services',
            'Show your event and entertainment services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking',
            'Booking',
            'Accept event booking requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'cleaning-services',
        name: 'Cleaning Services',
        icon: 'bx-broom',
        features: [
          feature(
            'services',
            'Services',
            'Show your cleaning services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'booking-request',
            'Booking / Request',
            'Accept cleaning service requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'construction-contractor',
        name: 'Construction / Contractor',
        icon: 'bx-hard-hat',
        features: [
          feature(
            'services',
            'Services',
            'Show your construction and contractor services.',
            'bx-briefcase-alt-2',
          ),
          feature(
            'request-quote',
            'Request a Quote',
            'Allow customers to request a project quote.',
            'bx-file',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'tutorial-training',
        name: 'Tutorial / Training',
        icon: 'bx-book-open',
        features: [
          feature(
            'services-programs',
            'Services / Programs',
            'Show your training programs and services.',
            'bx-book-open',
          ),
          feature(
            'booking-enrollment',
            'Booking / Enrollment',
            'Accept enrollment and booking requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special deals.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },
    ],
  },

  // =====================================================
  // HOTELS
  // =====================================================

  {
    id: 'hotels',
    name: 'Hotels',
    icon: 'bx-hotel',
    description: 'Hotels, resorts, inns, lodges, and accommodation businesses.',
    types: [
      {
        id: 'hotel',
        name: 'Hotel',
        icon: 'bx-hotel',
        features: [
          feature(
            'rooms',
            'Rooms',
            'Manage and showcase available rooms.',
            'bx-bed',
          ),
          feature(
            'booking',
            'Booking',
            'Accept room booking requests.',
            'bx-calendar',
          ),
          feature(
            'amenities',
            'Services & Amenities',
            'Show hotel services and amenities.',
            'bx-spa',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special packages.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'resort',
        name: 'Resort',
        icon: 'bx-building-house',
        features: [
          feature(
            'rooms',
            'Rooms',
            'Manage and showcase available rooms.',
            'bx-bed',
          ),
          feature(
            'booking',
            'Booking',
            'Accept resort booking requests.',
            'bx-calendar',
          ),
          feature(
            'amenities',
            'Services & Amenities',
            'Show resort services and amenities.',
            'bx-spa',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special packages.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'inn',
        name: 'Inn',
        icon: 'bx-home',
        features: [
          feature(
            'rooms',
            'Rooms',
            'Manage and showcase available rooms.',
            'bx-bed',
          ),
          feature(
            'booking',
            'Booking',
            'Accept room booking requests.',
            'bx-calendar',
          ),
          feature(
            'amenities',
            'Services & Amenities',
            'Show available services and amenities.',
            'bx-spa',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special packages.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'lodge',
        name: 'Lodge',
        icon: 'bx-building',
        features: [
          feature(
            'rooms',
            'Rooms',
            'Manage and showcase available rooms.',
            'bx-bed',
          ),
          feature(
            'booking',
            'Booking',
            'Accept room booking requests.',
            'bx-calendar',
          ),
          feature(
            'amenities',
            'Services & Amenities',
            'Show available services and amenities.',
            'bx-spa',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special packages.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'apartelle',
        name: 'Apartelle',
        icon: 'bx-buildings',
        features: [
          feature(
            'rooms-units',
            'Rooms / Units',
            'Manage available rooms and units.',
            'bx-bed',
          ),
          feature(
            'booking',
            'Booking',
            'Accept unit booking requests.',
            'bx-calendar',
          ),
          feature(
            'amenities',
            'Services & Amenities',
            'Show available services and amenities.',
            'bx-spa',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special packages.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'bed-breakfast',
        name: 'Bed & Breakfast',
        icon: 'bx-bed',
        features: [
          feature(
            'rooms',
            'Rooms',
            'Manage and showcase available rooms.',
            'bx-bed',
          ),
          feature(
            'booking',
            'Booking',
            'Accept room booking requests.',
            'bx-calendar',
          ),
          feature(
            'amenities',
            'Services & Amenities',
            'Show available services and amenities.',
            'bx-spa',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and special packages.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive customer questions and messages.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View business activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },
    ],
  },

  // =====================================================
  // BOARDING HOUSES
  // =====================================================

  {
    id: 'boarding-houses',
    name: 'Boarding Houses',
    icon: 'bx-home',
    description: 'Boarding houses, dormitories, bedspaces, and rental units.',
    types: [
      {
        id: 'boarding-house',
        name: 'Boarding House',
        icon: 'bx-home',
        features: [
          feature(
            'rooms-units',
            'Rooms / Units',
            'Show available rooms and units.',
            'bx-bed',
          ),
          feature(
            'booking-inquiry',
            'Booking / Inquiry',
            'Accept room booking and inquiry requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and rental promotions.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions from potential tenants.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View listing activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'dormitory',
        name: 'Dormitory',
        icon: 'bx-building-house',
        features: [
          feature(
            'rooms-units',
            'Rooms / Units',
            'Show available rooms and units.',
            'bx-bed',
          ),
          feature(
            'booking-inquiry',
            'Booking / Inquiry',
            'Accept booking and inquiry requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and rental promotions.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions from potential tenants.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View listing activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'bedspace',
        name: 'Bedspace',
        icon: 'bx-bed',
        features: [
          feature(
            'rooms-units',
            'Rooms / Units',
            'Show available bedspaces and units.',
            'bx-bed',
          ),
          feature(
            'booking-inquiry',
            'Booking / Inquiry',
            'Accept booking and inquiry requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share offers and rental promotions.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions from potential tenants.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View listing activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'apartment-rental',
        name: 'Apartment / Rental',
        icon: 'bx-building',
        features: [
          feature(
            'units',
            'Units',
            'Show available rental units.',
            'bx-building',
          ),
          feature(
            'booking-inquiry',
            'Booking / Inquiry',
            'Accept rental booking and inquiry requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share rental offers and promotions.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions from potential tenants.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View listing activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },

      {
        id: 'room-for-rent',
        name: 'Room for Rent',
        icon: 'bx-door-open',
        features: [
          feature(
            'rooms-units',
            'Rooms / Units',
            'Show available rooms and rental units.',
            'bx-bed',
          ),
          feature(
            'booking-inquiry',
            'Booking / Inquiry',
            'Accept room booking and inquiry requests.',
            'bx-calendar',
          ),
          feature(
            'promotions',
            'Promotions',
            'Share rental offers and promotions.',
            'bx-purchase-tag',
          ),
          feature(
            'inquiries',
            'Inquiries',
            'Receive questions from potential tenants.',
            'bx-message-rounded-dots',
          ),
          feature(
            'analytics',
            'Analytics',
            'View listing activity and performance.',
            'bx-bar-chart-alt-2',
          ),
        ],
      },
    ],
  },
];
