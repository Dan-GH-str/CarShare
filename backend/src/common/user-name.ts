export type UserNameParts = {
  lastName: string;
  firstName: string;
  middleName?: string | null;
};

export function formatUserName(user: UserNameParts) {
  return [user.lastName, user.firstName, user.middleName].filter(Boolean).join(' ');
}
