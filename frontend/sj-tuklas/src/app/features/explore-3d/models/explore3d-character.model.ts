export interface Explore3dCharacter {
  userId: string;
  username: string;
  characterModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExplore3dCharacterRequest {
  username: string;
  characterModel: string;
}

export interface UpdateExplore3dCharacterRequest {
  username: string;
  characterModel?: string;
}
