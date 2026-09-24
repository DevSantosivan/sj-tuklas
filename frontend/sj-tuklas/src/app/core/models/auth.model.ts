export type AccountRole = 'visitor' | 'business_owner' | 'admin';

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AccountRole | null;
}

export interface AuthResponse {
  user: AuthUser;
  expiresIn: number;
}
