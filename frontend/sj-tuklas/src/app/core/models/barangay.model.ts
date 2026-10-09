export interface Barangay {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  image?: string;
  location?: string;
  description?: string;

  population?: number;
  populationYear?: 2020;
  history?: string;
  historyStatus?: 'available' | 'to-be-updated';
  source?: string;
}
