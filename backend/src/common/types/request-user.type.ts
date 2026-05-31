import { UserRole, UserStatus } from '@prisma/client';

export type RequestUser = {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  phone: string;
  role: UserRole;
  status: UserStatus;
};
