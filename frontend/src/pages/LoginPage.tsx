import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { FormSummary } from '../components/FormSummary';
import { useAuth } from '../context/AuthContext';
import { friendlyAuthError } from '../utils/formErrors';

const requiredString = (label: string) =>
  z
    .string({
      required_error: `${label} не заполнено`,
      invalid_type_error: `${label} должно быть строкой`,
    })
    .trim()
    .min(1, `${label} не заполнено`);

const loginSchema = z.object({
  email: requiredString('Email').email('Введите email в формате name@example.com'),
  password: requiredString('Пароль').min(8, 'Пароль должен быть не короче 8 символов'),
});

type LoginFormData = z.input<typeof loginSchema>;
type FormErrors = Partial<Record<keyof LoginFormData, string[]>>;

const fieldLabels: Record<keyof LoginFormData, string> = {
  email: 'Email',
  password: 'Пароль',
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError('');
    const parsed = loginSchema.safeParse(readLoginForm(event.currentTarget));

    if (!parsed.success) {
      setErrors(zodErrorsToFormErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (error) {
      setApiError(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFieldError(field: keyof LoginFormData) {
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
        <p className="eyebrow">Аккаунт</p>
        <h1>Вход</h1>
        <FormSummary messages={validationMessages} serverMessage={apiError} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={firstError(errors.email)}
          hint={errors.email ? 'Введите почту в формате name@example.com.' : undefined}
          onChange={() => clearFieldError('email')}
        />
        <Field
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          error={firstError(errors.password)}
          hint={errors.password ? 'Пароль должен содержать минимум 8 символов.' : undefined}
          onChange={() => clearFieldError('password')}
        />
        <Button type="submit" disabled={isSubmitting}>
          Войти
        </Button>
        <p>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </section>
  );
}

function readLoginForm(form: HTMLFormElement): LoginFormData {
  const formData = new globalThis.FormData(form);

  return {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
}

function zodErrorsToFormErrors(error: z.ZodError<LoginFormData>): FormErrors {
  return error.issues.reduce<FormErrors>((acc, issue) => {
    const field = issue.path[0] as keyof LoginFormData | undefined;
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
    (errors[field as keyof LoginFormData] ?? []).map((message) => `${label}: ${message}`),
  );
}
