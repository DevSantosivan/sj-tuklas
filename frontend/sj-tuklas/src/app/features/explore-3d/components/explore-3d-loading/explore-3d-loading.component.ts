import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Explore3dWorldService } from '../../services/explore3d-world.service';

@Component({
  selector: 'app-explore-loading',
  standalone: true,
  imports: [],
  templateUrl: './explore-3d-loading.component.html',
  styleUrl: './explore-3d-loading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explore3dLoadingComponent {
  readonly worldService = inject(Explore3dWorldService);
}
