import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, Star } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Field, SelectField, TextAreaField } from '../components/Field';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { formatPersonName } from '../utils/name';

export function ProfilePage() {
  const { refreshUser, user } = useAuth();
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: api.users.profile,
    enabled: Boolean(user?.id),
  });
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceRating, setServiceRating] = useState(5);
  const [serviceText, setServiceText] = useState('');

  useEffect(() => {
    if (profileQuery.data) {
      setLastName(profileQuery.data.lastName);
      setFirstName(profileQuery.data.firstName);
      setMiddleName(profileQuery.data.middleName ?? '');
      setPhone(profileQuery.data.phone);
    }
  }, [profileQuery.data]);

  const updateProfile = useMutation({
    mutationFn: () => api.users.update({ lastName, firstName, middleName, phone }),
    onSuccess: async () => {
      await refreshUser();
      await profileQuery.refetch();
    },
  });

  const createServiceReview = useMutation({
    mutationFn: () => api.serviceReviews.create({ rating: serviceRating, text: serviceText }),
    onSuccess: () => setServiceText(''),
  });

  if (profileQuery.isLoading) {
    return <div className="stateBlock">Загружаем профиль...</div>;
  }

  const profile = profileQuery.data;
  if (!profile) {
    return <div className="stateBlock error">Профиль недоступен</div>;
  }

  return (
    <section className="page profilePage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Профиль</p>
          <h1>{formatPersonName(profile)}</h1>
        </div>
        <StatusBadge status={profile.status} />
      </div>

      <div className="statsGrid">
        <Stat label="Поездки" value={profile.stats?.tripsCount ?? 0} />
        <Stat label="Потрачено" value={`${(profile.stats?.totalSpend ?? 0).toLocaleString('ru-RU')} ₽`} />
        <Stat label="Последний авто" value={profile.stats?.lastCar ?? '—'} />
      </div>

      <section className="sectionBlock">
        <h2>Личные данные</h2>
        <div className="formGrid">
          <Field label="Фамилия" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          <Field label="Имя" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          <Field label="Отчество" value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
          <Field label="Телефон" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Field label="Email" value={profile.email} disabled />
        </div>
        {updateProfile.isError ? <div className="formError">{updateProfile.error.message}</div> : null}
        <Button icon={<Save size={18} />} onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
          Сохранить
        </Button>
      </section>

      <section className="sectionBlock">
        <h2>Отзыв о сервисе</h2>
        <div className="reviewForm">
          <SelectField
            label="Оценка"
            value={serviceRating}
            onChange={(event) => setServiceRating(Number(event.target.value))}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            label="Текст"
            value={serviceText}
            rows={4}
            onChange={(event) => setServiceText(event.target.value)}
          />
          {createServiceReview.isSuccess ? <div className="successNote">Отзыв отправлен</div> : null}
          <Button
            icon={<Star size={18} />}
            onClick={() => createServiceReview.mutate()}
            disabled={!serviceText.trim() || createServiceReview.isPending}
          >
            Оставить отзыв
          </Button>
        </div>
      </section>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
