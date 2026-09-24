import { Routes } from '@angular/router';

// =========================================================
// GUARDS
// =========================================================

import { visitorDashboardGuard } from './core/guards/visitor-dashboard.guard';
import { businessOwnerGuard } from './core/guards/business-owner.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // =========================================================
  // BUSINESS OWNER DASHBOARD
  // =========================================================

  {
    path: 'business/dashboard',

    // Only business_owner can access this area
    canActivate: [businessOwnerGuard],

    loadComponent: () =>
      import('./features/business-dashboard/layout/business-layout/business-layout.component').then(
        (m) => m.BusinessLayoutComponent,
      ),

    children: [
      // -------------------------------------------------------
      // DEFAULT
      // /business/dashboard
      // ↓
      // /business/dashboard/overview
      // -------------------------------------------------------

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },

      // -------------------------------------------------------
      // OVERVIEW
      // -------------------------------------------------------

      {
        path: 'overview',
        loadComponent: () =>
          import('./features/business-dashboard/pages/overview/overview.component').then(
            (m) => m.OverviewComponent,
          ),
      },

      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------

      {
        path: 'profile',
        loadComponent: () =>
          import('./features/business-dashboard/pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },

      // -------------------------------------------------------
      // REVIEWS
      // -------------------------------------------------------

      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/business-dashboard/pages/reviews/reviews.component').then(
            (m) => m.ReviewsComponent,
          ),
      },

      // -------------------------------------------------------
      // SUBSCRIPTION
      // -------------------------------------------------------

      {
        path: 'subscription',
        loadComponent: () =>
          import('./features/business-dashboard/pages/subscription/subscription.component').then(
            (m) => m.SubscriptionComponent,
          ),
      },

      // -------------------------------------------------------
      // BILLING
      // -------------------------------------------------------

      {
        path: 'billing',
        loadComponent: () =>
          import('./features/business-dashboard/pages/billing/billing.component').then(
            (m) => m.BillingComponent,
          ),
      },

      // -------------------------------------------------------
      // SETTINGS
      // -------------------------------------------------------

      {
        path: 'settings',
        loadComponent: () =>
          import('./features/business-dashboard/pages/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },

      // -------------------------------------------------------
      // MENU
      // -------------------------------------------------------

      {
        path: 'menu',
        loadComponent: () =>
          import('./features/business-dashboard/pages/menu/menu.component').then(
            (m) => m.MenuComponent,
          ),
      },

      // -------------------------------------------------------
      // ORDERS
      // -------------------------------------------------------

      {
        path: 'orders',
        loadComponent: () =>
          import('./features/business-dashboard/pages/orders/orders.component').then(
            (m) => m.OrdersComponent,
          ),
      },

      // -------------------------------------------------------
      // ROOMS
      // -------------------------------------------------------

      {
        path: 'rooms',
        loadComponent: () =>
          import('./features/business-dashboard/pages/rooms/rooms.component').then(
            (m) => m.RoomsComponent,
          ),
      },

      // -------------------------------------------------------
      // BOOKINGS
      // -------------------------------------------------------

      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/business-dashboard/pages/bookings/bookings.component').then(
            (m) => m.BookingsComponent,
          ),
      },

      // -------------------------------------------------------
      // SERVICES
      // -------------------------------------------------------

      {
        path: 'services',
        loadComponent: () =>
          import('./features/business-dashboard/pages/services/services.component').then(
            (m) => m.ServicesComponent,
          ),
      },

      // -------------------------------------------------------
      // PROMOTIONS
      // -------------------------------------------------------

      {
        path: 'promotions',
        loadComponent: () =>
          import('./features/business-dashboard/pages/promotions/promotions.component').then(
            (m) => m.PromotionsComponent,
          ),
      },

      // -------------------------------------------------------
      // ANALYTICS
      // -------------------------------------------------------

      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/business-dashboard/pages/analytics/analytics.component').then(
            (m) => m.AnalyticsComponent,
          ),
      },
    ],
  },

  // =========================================================
  // VISITOR DASHBOARD
  // =========================================================

  {
    path: 'dashboard/:id',

    // Only visitor can access
    // Also checks that :id belongs to logged-in visitor
    canActivate: [visitorDashboardGuard],

    loadComponent: () =>
      import('./features/visitor-dashboard/layout/visitor-layout/visitor-layout.component').then(
        (m) => m.VisitorLayoutComponent,
      ),

    children: [
      // -------------------------------------------------------
      // DEFAULT
      // /dashboard/:id
      // ↓
      // /dashboard/:id/overview
      // -------------------------------------------------------

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },

      // -------------------------------------------------------
      // OVERVIEW
      // -------------------------------------------------------

      {
        path: 'overview',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/overview/overview.component').then(
            (m) => m.OverviewComponent,
          ),
      },

      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------

      {
        path: 'profile',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },

      // -------------------------------------------------------
      // FAVORITES
      // -------------------------------------------------------

      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/favorites/favorites.component').then(
            (m) => m.FavoritesComponent,
          ),
      },

      // -------------------------------------------------------
      // BOOKINGS
      // -------------------------------------------------------

      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/bookings/bookings.component').then(
            (m) => m.BookingsComponent,
          ),
      },

      // -------------------------------------------------------
      // BOOKING DETAILS
      // /dashboard/:id/bookings/:bookingId
      // -------------------------------------------------------

      {
        path: 'bookings/:bookingId',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/booking-details/booking-details.component').then(
            (m) => m.BookingDetailsComponent,
          ),
      },

      // -------------------------------------------------------
      // ORDERS
      // -------------------------------------------------------

      {
        path: 'orders',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/orders/orders.component').then(
            (m) => m.OrdersComponent,
          ),
      },

      // -------------------------------------------------------
      // TRANSACTIONS
      // -------------------------------------------------------

      // {
      //   path: 'transactions',
      //   loadComponent: () =>
      //     import('./features/visitor-dashboard/pages/transactions/transactions.component').then(
      //       (m) => m.TransactionsComponent,
      //     ),
      // },

      // -------------------------------------------------------
      // INQUIRIES
      // -------------------------------------------------------

      {
        path: 'inquiries',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/inquiries/inquiries.component').then(
            (m) => m.InquiriesComponent,
          ),
      },

      // -------------------------------------------------------
      // RECENTLY VIEWED
      // -------------------------------------------------------

      {
        path: 'recently-viewed',
        loadComponent: () =>
          import('./features/visitor-dashboard/pages/recently-viewed/recently-viewed.component').then(
            (m) => m.RecentlyViewedComponent,
          ),
      },

      // -------------------------------------------------------
      // NOTIFICATIONS
      // -------------------------------------------------------

      // {
      //   path: 'notifications',
      //   loadComponent: () =>
      //     import('./features/visitor-dashboard/pages/notifications/notifications.component').then(
      //       (m) => m.NotificationsComponent,
      //     ),
      // },
    ],
  },

  // =========================================================
  // PUBLIC WEBSITE
  // =========================================================

  {
    path: '',

    loadComponent: () =>
      import('./features/layout/public-layout/public-layout.component').then(
        (m) => m.PublicLayoutComponent,
      ),

    children: [
      // -------------------------------------------------------
      // HOME
      // /
      // -------------------------------------------------------

      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },

      // -------------------------------------------------------
      // SEARCH
      // -------------------------------------------------------

      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/pages/search-page/search-page.component').then(
            (m) => m.SearchPageComponent,
          ),
      },

      // -------------------------------------------------------
      // CATEGORIES
      // -------------------------------------------------------

      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/pages/categories-page/categories-page.component').then(
            (m) => m.CategoriesPageComponent,
          ),
      },

      // -------------------------------------------------------
      // LOGIN
      // -------------------------------------------------------

      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },

      // -------------------------------------------------------
      // REGISTER
      // -------------------------------------------------------

      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },

      // -------------------------------------------------------
      // LOCATIONS
      // -------------------------------------------------------

      {
        path: 'locations',
        loadComponent: () =>
          import('./features/locations/pages/locations-page/locations-page.component').then(
            (m) => m.LocationsPageComponent,
          ),
      },

      // -------------------------------------------------------
      // LOCATION DETAILS
      // -------------------------------------------------------

      {
        path: 'locations/:slug',
        loadComponent: () =>
          import('./features/locations/pages/location-details/location-details.component').then(
            (m) => m.LocationDetailsComponent,
          ),
      },

      // =====================================================
      // BUSINESS PUBLIC PAGES
      // =====================================================

      // -------------------------------------------------------
      // RESERVE
      // -------------------------------------------------------

      {
        path: 'business/:id/reserve',
        loadComponent: () =>
          import('./features/business/pages/business-reservation/business-reservation.component').then(
            (m) => m.BusinessReservationComponent,
          ),
      },

      // -------------------------------------------------------
      // INQUIRE
      // -------------------------------------------------------

      {
        path: 'business/:id/inquire',
        loadComponent: () =>
          import('./features/business/pages/business-inquiry/business-inquiry.component').then(
            (m) => m.BusinessInquiryComponent,
          ),
      },

      // -------------------------------------------------------
      // ROOMS
      // -------------------------------------------------------

      {
        path: 'business/:id/rooms',
        loadComponent: () =>
          import('./features/business/pages/business-rooms/business-rooms.component').then(
            (m) => m.BusinessRoomsComponent,
          ),
      },

      // -------------------------------------------------------
      // AVAILABILITY
      // -------------------------------------------------------

      {
        path: 'business/:id/availability',
        loadComponent: () =>
          import('./features/business/pages/business-availability/business-availability.component').then(
            (m) => m.BusinessAvailabilityComponent,
          ),
      },

      // -------------------------------------------------------
      // BUSINESS REGISTER
      // -------------------------------------------------------

      {
        path: 'business/register',
        loadComponent: () =>
          import('./features/business/pages/business-register/business-register.component').then(
            (m) => m.BusinessRegisterComponent,
          ),
      },

      // -------------------------------------------------------
      // BUSINESS CREATE
      // -------------------------------------------------------

      {
        path: 'business/create/:userId',
        loadComponent: () =>
          import('./features/business/pages/business-create/business-create.component').then(
            (m) => m.BusinessCreateComponent,
          ),
      },

      // -------------------------------------------------------
      // BUSINESS PRICING
      // -------------------------------------------------------

      {
        path: 'business/pricing',
        loadComponent: () =>
          import('./features/business-dashboard/pages/subscription/subscription.component').then(
            (m) => m.SubscriptionComponent,
          ),
      },

      // -------------------------------------------------------
      // BOOK
      // -------------------------------------------------------

      {
        path: 'business/:id/book',
        loadComponent: () =>
          import('./features/business/pages/business-booking/business-booking.component').then(
            (m) => m.BusinessBookingComponent,
          ),
      },

      // -------------------------------------------------------
      // SERVICES
      // -------------------------------------------------------

      {
        path: 'business/:id/services',
        loadComponent: () =>
          import('./features/business/pages/business-services/business-services.component').then(
            (m) => m.BusinessServicesComponent,
          ),
      },

      // -------------------------------------------------------
      // MENU
      // -------------------------------------------------------

      {
        path: 'business/:id/menu',
        loadComponent: () =>
          import('./features/business/pages/business-menu/business-menu.component').then(
            (m) => m.BusinessMenuComponent,
          ),
      },

      // -------------------------------------------------------
      // PROMOTIONS
      // -------------------------------------------------------

      {
        path: 'business/:id/promotions',
        loadComponent: () =>
          import('./features/business/pages/business-promotions/business-promotions.component').then(
            (m) => m.BusinessPromotionsComponent,
          ),
      },

      // -------------------------------------------------------
      // DIRECTIONS
      // -------------------------------------------------------

      {
        path: 'directions/:id',
        loadComponent: () =>
          import('./features/business/pages/directions/directions.component').then(
            (m) => m.DirectionsComponent,
          ),
      },

      // -------------------------------------------------------
      // BUSINESS DETAILS
      // -------------------------------------------------------

      {
        path: 'business/:id',
        loadComponent: () =>
          import('./features/business/pages/business-details/business-details.component').then(
            (m) => m.BusinessDetailsComponent,
          ),
      },

      // =====================================================
      // LEGAL
      // =====================================================

      // -------------------------------------------------------
      // TERMS
      // -------------------------------------------------------

      {
        path: 'terms',
        loadComponent: () =>
          import('./features/legal/pages/terms-of-service/terms-of-service.component').then(
            (m) => m.TermsOfServiceComponent,
          ),
      },

      // -------------------------------------------------------
      // PRIVACY
      // -------------------------------------------------------

      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/legal/pages/privacy-policy/privacy-policy.component').then(
            (m) => m.PrivacyPolicyComponent,
          ),
      },

      // -------------------------------------------------------
      // COMMUNITY GUIDELINES
      // -------------------------------------------------------

      {
        path: 'community-guidelines',
        loadComponent: () =>
          import('./features/legal/pages/community-guidelines/community-guidelines.component').then(
            (m) => m.CommunityGuidelinesComponent,
          ),
      },

      // -------------------------------------------------------
      // BUSINESS TERMS
      // -------------------------------------------------------

      {
        path: 'business-terms',
        loadComponent: () =>
          import('./features/legal/pages/business-terms/business-terms.component').then(
            (m) => m.BusinessTermsComponent,
          ),
      },

      // -------------------------------------------------------
      // COOKIES
      // -------------------------------------------------------

      {
        path: 'cookies',
        loadComponent: () =>
          import('./features/legal/pages/cookie-policy/cookie-policy.component').then(
            (m) => m.CookiePolicyComponent,
          ),
      },
    ],
  },

  // =========================================================
  // ADMIN
  // =========================================================

  {
    path: 'admin',

    canActivate: [adminGuard],

    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),

    children: [
      // -------------------------------------------------------
      // DEFAULT
      // /admin
      // ↓
      // /admin/dashboard
      // -------------------------------------------------------

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },

      // -------------------------------------------------------
      // DASHBOARD
      // -------------------------------------------------------

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },

      // -------------------------------------------------------
      // APPROVALS
      // -------------------------------------------------------

      {
        path: 'approvals',
        loadComponent: () =>
          import('./features/admin/pages/approvals/approvals.component').then(
            (m) => m.ApprovalsComponent,
          ),
      },

      {
        path: 'approvals/:id',
        loadComponent: () =>
          import('./features/admin/pages/approvals/approval-details/approval-details.component').then(
            (m) => m.ApprovalDetailsComponent,
          ),
      },

      // -------------------------------------------------------
      // BUSINESSES
      // -------------------------------------------------------

      {
        path: 'businesses',
        loadComponent: () =>
          import('./features/admin/pages/businesses/businesses.component').then(
            (m) => m.BusinessesComponent,
          ),
      },

      // -------------------------------------------------------
      // USERS
      // -------------------------------------------------------

      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/users/users.component').then(
            (m) => m.UsersComponent,
          ),
      },

      // -------------------------------------------------------
      // BOOKINGS
      // -------------------------------------------------------

      // -------------------------------------------------------
      // ORDERS
      // -------------------------------------------------------

      // -------------------------------------------------------
      // REPORTS
      // -------------------------------------------------------

      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/pages/reports/reports.component').then(
            (m) => m.ReportsComponent,
          ),
      },

      // -------------------------------------------------------
      // SETTINGS
      // -------------------------------------------------------
    ],
  },

  // =========================================================
  // FALLBACK
  // =========================================================

  {
    path: '**',
    redirectTo: '',
  },
];
