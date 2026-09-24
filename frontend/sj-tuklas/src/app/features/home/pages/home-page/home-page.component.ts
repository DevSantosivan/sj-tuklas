import { Component } from '@angular/core';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { CategoryGridComponent } from '../../components/category-grid/category-grid.component';
import { FeaturedBusinessesComponent } from '../../components/featured-businesses/featured-businesses.component';
import { PopularBusinessesComponent } from '../../components/popular-businesses/popular-businesses.component';
import { ExploreLocationsComponent } from '../../components/explore-locations/explore-locations.component';
import { BusinessOwnerCtaComponent } from '../../components/business-owner-cta/business-owner-cta.component';
import { CommunityStatsComponent } from '../../components/community-stats/community-stats.component';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSectionComponent,
    CategoryGridComponent,
    FeaturedBusinessesComponent,
    PopularBusinessesComponent,
    ExploreLocationsComponent,
    BusinessOwnerCtaComponent,
    CommunityStatsComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
