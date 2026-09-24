import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  loading = input(false);

  title = input('Nothing found');

  message = input('There is nothing to display here.');

  icon = input('bx-info-circle');

  buttonText = input('');

  buttonLink = input('');
}
