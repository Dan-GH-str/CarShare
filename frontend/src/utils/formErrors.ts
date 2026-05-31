import { FieldError, FieldErrors, FieldValues } from 'react-hook-form';

type ErrorLike = FieldError | undefined;

export function errorMessages(error: ErrorLike) {
  if (!error) {
    return [];
  }

  const typedMessages = error.types
    ? Object.values(error.types)
        .flat()
        .filter(Boolean)
        .map(String)
    : [];

  if (typedMessages.length) {
    return typedMessages;
  }

  return error.message ? [error.message] : [];
}

export function firstError(error: ErrorLike) {
  return errorMessages(error)[0];
}

export function formErrorSummary<T extends FieldValues>(
  errors: FieldErrors<T>,
  labels: Partial<Record<keyof T, string>>,
) {
  return Object.entries(labels).flatMap(([field, label]) => {
    const messages = errorMessages(errors[field as keyof T] as ErrorLike);
    return messages.map((message) => `${label}: ${message}`);
  });
}

export function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (!message) {
    return 'Произошла неизвестная ошибка. Попробуйте еще раз.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('сервер недоступен')) {
    return 'Сервер недоступен. Повторите попытку позже.';
  }
  if (normalized.includes('email') && normalized.includes('существ')) {
    return 'Аккаунт с такой почтой уже зарегистрирован. Войдите или используйте другой email.';
  }
  if (normalized.includes('неверный email') || normalized.includes('пароль')) {
    return 'Email или пароль не совпадают с зарегистрированным аккаунтом.';
  }
  if (normalized.includes('заблокирован')) {
    return 'Аккаунт заблокирован. Вход и бронирования недоступны.';
  }

  return message;
}
