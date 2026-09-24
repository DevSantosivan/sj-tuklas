import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  imports: [],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent {
  @Input() value = '';

  @Input()
  placeholder = 'Search businesses, types, services...';

  @Input()
  ariaLabel = 'Search';

  @Input()
  showShortcut = true;

  @Input()
  showClear = true;

  @Output()
  valueChange = new EventEmitter<string>();

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.valueChange.emit(input.value);
  }

  clear(): void {
    this.valueChange.emit('');
  }
}
