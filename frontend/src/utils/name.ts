export type NameLike = {
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  displayName?: string | null;
};

export function formatPersonName(person?: NameLike | null) {
  if (!person) {
    return '';
  }

  return (
    person.displayName ||
    [person.lastName, person.firstName, person.middleName].filter(Boolean).join(' ') ||
    'Пользователь'
  );
}

export function formatShortName(person?: NameLike | null) {
  if (!person) {
    return '';
  }

  return person.firstName || person.lastName || person.displayName || 'Профиль';
}
