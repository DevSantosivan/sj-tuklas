import { Injectable, signal } from '@angular/core';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

@Injectable({
  providedIn: 'root',
})
export class CurrentLocationService {
  readonly coordinates = signal<UserCoordinates | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  locate(): void {
    if (!('geolocation' in navigator)) {
      this.error.set('Hindi suportado ng browser ang geolocation.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.coordinates.set({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        this.loading.set(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Payagan ang location permission sa browser.',
          2: 'Hindi makuha ang kasalukuyang lokasyon.',
          3: 'Nag-timeout ang pagkuha ng lokasyon.',
        };

        this.error.set(
          messages[error.code] ?? 'May problema sa pagkuha ng lokasyon.',
        );

        this.loading.set(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  }
}
