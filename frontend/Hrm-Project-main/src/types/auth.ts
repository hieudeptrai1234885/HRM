export type UserRole = "admin" | "manager" | "staff" | string;

export interface AuthUser {
  id: number;
  email: string;
  full_name?: string;
  department?: string;
  position?: string;
  role: UserRole;
}
