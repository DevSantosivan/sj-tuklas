import { Component, computed, inject, signal } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { DecimalPipe } from '@angular/common';

import { BUSINESSES } from '../../../../core/data/business.data';

@Component({
  selector: 'app-business-rooms',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './business-rooms.component.html',
  styleUrl: './business-rooms.component.scss',
})
export class BusinessRoomsComponent {
  private readonly route = inject(ActivatedRoute);

  readonly businessId = this.route.snapshot.paramMap.get('id');

  readonly business = computed(() =>
    BUSINESSES.find((business) => business.id === this.businessId),
  );

  /*
   * SELECTED ROOM
   */
  readonly selectedRoom = signal<string | null>(null);

  /*
   * SAMPLE ROOMS
   *
   * Later, these will come from Supabase / BusinessService.
   */
  readonly rooms = [
    {
      id: 'room-1',
      name: 'Room 1',
      description:
        'Comfortable shared room suitable for students and working individuals.',
      totalSlots: 4,
      occupiedSlots: 3,
      monthlyRate: 3500,
      beds: '4 Single Beds',
      amenities: ['Electric Fan', 'Wi-Fi', 'Shared Bathroom', 'Study Area'],
    },

    {
      id: 'room-2',
      name: 'Room 2',
      description:
        'Spacious shared room with a comfortable setup for long-term boarders.',
      totalSlots: 4,
      occupiedSlots: 2,
      monthlyRate: 3500,
      beds: '4 Single Beds',
      amenities: ['Electric Fan', 'Wi-Fi', 'Shared Bathroom', 'Study Area'],
    },

    {
      id: 'room-3',
      name: 'Room 3',
      description:
        'Private and quiet room option for boarders looking for a more relaxed space.',
      totalSlots: 2,
      occupiedSlots: 2,
      monthlyRate: 4500,
      beds: '2 Single Beds',
      amenities: ['Air Conditioning', 'Wi-Fi', 'Private Bathroom'],
    },

    {
      id: 'room-4',
      name: 'Room 4',
      description:
        'Simple and affordable accommodation for students and workers.',
      totalSlots: 4,
      occupiedSlots: 1,
      monthlyRate: 3000,
      beds: '4 Single Beds',
      amenities: ['Electric Fan', 'Wi-Fi', 'Shared Bathroom'],
    },
  ];

  /*
   * ROOM AVAILABILITY
   */
  readonly roomAvailability = computed(() => {
    return this.rooms.map((room) => {
      const availableSlots = Math.max(0, room.totalSlots - room.occupiedSlots);

      return {
        ...room,
        availableSlots,
        isAvailable: availableSlots > 0,
      };
    });
  });

  /*
   * SUMMARY TOTALS
   *
   * Computed here instead of using reduce()
   * directly inside the HTML template.
   */
  readonly totalAvailableSlots = computed(() =>
    this.roomAvailability().reduce(
      (total, room) => total + room.availableSlots,
      0,
    ),
  );

  readonly totalOccupiedSlots = computed(() =>
    this.roomAvailability().reduce(
      (total, room) => total + room.occupiedSlots,
      0,
    ),
  );

  /*
   * SELECTED ROOM DATA
   */
  readonly selectedRoomData = computed(() => {
    const roomId = this.selectedRoom();

    if (!roomId) {
      return null;
    }

    return this.roomAvailability().find((room) => room.id === roomId) ?? null;
  });

  /*
   * SELECT ROOM
   */
  selectRoom(roomId: string): void {
    this.selectedRoom.set(roomId);
  }

  /*
   * CLEAR SELECTED ROOM
   */
  clearSelection(): void {
    this.selectedRoom.set(null);
  }
}
