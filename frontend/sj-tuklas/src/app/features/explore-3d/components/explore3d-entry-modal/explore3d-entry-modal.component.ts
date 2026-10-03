import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Explore3dCharacterService } from '../../../../core/services/explore3d-character.service';
import { Character3dPreviewComponent } from '../character-3d-preview/character-3d-preview.component';

type ModalMode = 'auth' | 'character';

export type CharacterModelId = 'aj' | 'suit' | 'brian';

interface CharacterModelOption {
  id: CharacterModelId;
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-explore3d-entry-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Character3dPreviewComponent],
  templateUrl: './explore3d-entry-modal.component.html',
  styleUrl: './explore3d-entry-modal.component.scss',
})
export class Explore3dEntryModalComponent implements OnInit {
  private readonly characterService = inject(Explore3dCharacterService);

  @Input() isOpen = false;
  @Input() mode: ModalMode = 'auth';
  @Input() userName = 'Explorer';

  @Output() closed = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @Output() characterCreated = new EventEmitter<void>();

  readonly characterName = signal('');
  readonly selectedModel = signal<CharacterModelId>('aj');
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly characterModels: CharacterModelOption[] = [
    {
      id: 'aj',
      name: 'AJ Explorer',
      description: 'Classic 3D explorer',
      icon: 'bx-user',
    },
    {
      id: 'suit',
      name: 'Business Traveler',
      description: 'Formal character',
      icon: 'bx-user-pin',
    },
    {
      id: 'brian',
      name: 'Brian',
      description: 'Casual character',
      icon: 'bx-male',
    },
  ];

  ngOnInit(): void {
    this.characterName.set(this.userName || 'Explorer');
  }

  close(): void {
    if (this.isSaving()) return;

    this.closed.emit();
  }

  chooseModel(modelId: CharacterModelId): void {
    this.selectedModel.set(modelId);
    this.errorMessage.set('');
  }

  onRegister(): void {
    this.register.emit();
  }

  onLogin(): void {
    this.login.emit();
  }

  async createCharacter(): Promise<void> {
    if (this.isSaving()) return;

    const username = this.characterName().trim();

    if (username.length < 2 || username.length > 50) {
      this.errorMessage.set('Use a name between 2 and 50 characters.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      await firstValueFrom(
        this.characterService.createMyCharacter({
          username,
          characterModel: this.selectedModel(),
        }),
      );

      this.characterCreated.emit();
    } catch (error: unknown) {
      const message = (error as { error?: { message?: string } })?.error
        ?.message;

      this.errorMessage.set(
        message || 'Unable to create your character. Please try again.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
