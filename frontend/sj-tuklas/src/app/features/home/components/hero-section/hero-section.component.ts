import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, FormsModule],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
})
export class HeroSectionComponent {
  private router = inject(Router);

  searchTerm = '';

  search(): void {
    const query = this.searchTerm.trim();

    this.router.navigate(['/search'], {
      queryParams: query ? { q: query } : {},
    });
  }
}
