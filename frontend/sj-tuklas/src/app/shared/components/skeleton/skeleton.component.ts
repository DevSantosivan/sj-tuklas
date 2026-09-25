import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type SkeletonType =
  | 'line'
  | 'text'
  | 'title'
  | 'circle'
  | 'avatar'
  | 'image'
  | 'card'
  | 'business-card'
  | 'business-list'
  | 'map'
  | 'stats'
  | 'table'
  | 'search-results'
  | 'business-details';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  readonly type = input<SkeletonType>('line');

  readonly count = input<number>(1);

  readonly width = input<string>('');

  readonly height = input<string>('');

  readonly rounded = input<string>('medium');

  readonly items = computed(() =>
    Array.from({
      length: Math.max(1, this.count()),
    }),
  );
}
