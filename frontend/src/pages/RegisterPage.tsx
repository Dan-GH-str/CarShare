import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { FormSummary } from '../components/FormSummary';
import { useAuth } from '../context/AuthContext';
import { friendlyAuthError } from '../utils/formErrors';

const namePattern = /^[А-Яа-яЁёA-Za-z -]+$/;
const requiredString = (label: string) =>
  z
    .string({
      required_error: `${label} не заполнено`,
      invalid_type_error: `${label} должно быть строкой`,
    })
    .trim()
    .min(1, `${label} не заполнено`);

const registerSchema = z
  .object({
    lastName: requiredString('Фамилия')
      .min(2, 'Фамилия должна быть не короче 2 символов')
      .regex(namePattern, 'Фамилия может содержать только буквы, пробел и дефис'),
    firstName: requiredString('Имя')
      .min(2, 'Имя должно быть не короче 2 символов')
      .regex(namePattern, 'Имя может содержать только буквы, пробел и дефис'),
    middleName: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || value.length >= 2, 'Отчество должно быть не короче 2 символов')
      .refine((value) => value.length === 0 || namePattern.test(value), 'Отчество может содержать только буквы, пробел и дефис')
      .transform((value) => value || undefined),
    email: requiredString('Email').email('Введите email в формате name@example.com'),
    phone: requiredString('Телефон').regex(
      /^\+?[0-9][0-9\s().-]{9,19}$/,
      'Телефон должен содержать от 10 до 20 цифр, можно использовать +, пробелы, скобки и дефисы',
    ),
    password: requiredString('Пароль')
      .min(8, 'Пароль должен быть не короче 8 символов')
      .regex(/[A-Za-zА-Яа-яЁё]/, 'Пароль должен содержать хотя бы одну букву')
      .regex(/\d/, 'Пароль должен содержать хотя бы одну цифру'),
    confirm: requiredString('Повтор пароля'),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Пароли не совпадают',
  });

type RegisterFormData = z.input<typeof registerSchema>;
type FormErrors = Partial<Record<keyof RegisterFormData, string[]>>;

const fieldLabels: Record<keyof RegisterFormData, string> = {
  lastName: 'Фамилия',
  firstName: 'Имя',
  middleName: 'Отчество',
  email: 'Email',
  phone: 'Телефон',
  password: 'Пароль',
  confirm: 'Повтор пароля',
};

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError('');
    const parsed = registerSchema.safeParse(readRegisterForm(event.currentTarget));

    if (!parsed.success) {
      setErrors(zodErrorsToFormErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await createAccount({
        lastName: parsed.data.lastName,
        firstName: parsed.data.firstName,
        middleName: parsed.data.middleName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        password: parsed.data.password,
      });
      navigate('/', { replace: true });
    } catch (error) {
      setApiError(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFieldError(field: keyof RegisterFormData) {
    setApiError('');
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  const validationMessages = formErrorSummary(errors);

  return (
    <section className="authPage">
      <form className="authCard" onSubmit={onSubmit} noValidate>
        <p className="eyebrow">Новый аккаунт</p>
        <h1>Регистрация</h1>
        <FormSummary messages={validationMessages} serverMessage={apiError} />
        <Field
          label="Фамилия"
          name="lastName"
          autoComplete="family-name"
          error={firstError(errors.lastName)}
          hint={errors.lastName ? 'Минимум 2 символа; только буквы, пробел и дефис.' : undefined}
          onChange={() => clearFieldError('lastName')}
        />
        <Field
          label="Имя"
          name="firstName"
          autoComplete="given-name"
          error={firstError(errors.firstName)}
          hint={errors.firstName ? 'Минимум 2 символа; только буквы, пробел и дефис.' : undefined}
          onChange={() => clearFieldError('firstName')}
        />
        <Field
          label="Отчество"
          name="middleName"
          autoComplete="additional-name"
          error={firstError(errors.middleName)}
          hint={errors.middleName ? 'Поле можно оставить пустым; если заполняете, используйте минимум 2 буквы.' : undefined}
          onChange={() => clearFieldError('middleName')}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={firstError(errors.email)}
          hint={errors.email ? 'Пример корректного email: name@example.com.' : undefined}
          onChange={() => clearFieldError('email')}
        />
        <Field
          label="Телефон"
          name="phone"
          autoComplete="tel"
          error={firstError(errors.phone)}
          hint={errors.phone ? 'Минимум 10 цифр. Можно ввести +7 900 100-20-30.' : undefined}
          onChange={() => clearFieldError('phone')}
        />
        <Field
          label="Пароль"
          name="password"
          type="password"
          autoComplete="new-password"
          error={firstError(errors.password)}
          hint={errors.password ? 'Минимум 8 символов, хотя бы одна буква и одна цифра.' : undefined}
          onChange={() => clearFieldError('password')}
        />
        <Field
          label="Повтор пароля"
          name="confirm"
          type="password"
          autoComplete="new-password"
          error={firstError(errors.confirm)}
          hint={errors.confirm ? 'Повтор должен полностью совпадать с паролем.' : undefined}
          onChange={() => clearFieldError('confirm')}
        />
        <Button type="submit" disabled={isSubmitting}>
          Создать аккаунт
        </Button>
        <p>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  );
}

function readRegisterForm(form: HTMLFormElement): RegisterFormData {
  const formData = new globalThis.FormData(form);

  return {
    lastName: String(formData.get('lastName') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    middleName: String(formData.get('middleName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  };
}

function zodErrorsToFormErrors(error: z.ZodError<RegisterFormData>): FormErrors {
  return error.issues.reduce<FormErrors>((acc, issue) => {
    const field = issue.path[0] as keyof RegisterFormData | undefined;
    if (!field) {
      return acc;
    }
    acc[field] = [...(acc[field] ?? []), issue.message];
    return acc;
  }, {});
}

function firstError(messages?: string[]) {
  return messages?.[0];
}

function formErrorSummary(errors: FormErrors) {
  return Object.entries(fieldLabels).flatMap(([field, label]) =>
    (errors[field as keyof RegisterFormData] ?? []).map((message) => `${label}: ${message}`),
  );
}
