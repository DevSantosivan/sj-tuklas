import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-login-required-modal',
  standalone: true,
  templateUrl: './login-required-modal.component.html',
  styleUrl: './login-required-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginRequiredModalComponent {
  readonly primaryIcon = input<string>('bx-log-in');
  readonly visible = input(false);

  readonly icon = input('bx-lock-alt');
  readonly eyebrow = input('LOGIN REQUIRED');
  readonly title = input('Login required');
  readonly description = input('');

  readonly loginLabel = input('Login');
  readonly cancelLabel = input('Maybe later');
  readonly showCancelButton = input(true);

  readonly close = output<void>();
  readonly login = output<void>();

  onBackdropClick(): void {
    this.close.emit();
  }

  onCloseClick(): void {
    this.close.emit();
  }

  onLoginClick(): void {
    this.login.emit();
  }
}
