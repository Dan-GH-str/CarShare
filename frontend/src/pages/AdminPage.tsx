import { ChangeEvent, FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Upload, X } from 'lucide-react';
import { api, CreateCarPayload, CreateModelPayload } from '../api/client';
import { Button } from '../components/Button';
import { Field, SelectField } from '../components/Field';
import { FormSummary } from '../components/FormSummary';
import { StatusBadge } from '../components/StatusBadge';
import { CarStatus } from '../types/domain';
import { formatPersonName } from '../utils/name';

type Tab = 'dashboard' | 'cars' | 'users' | 'bookings' | 'reviews';

type CarFormState = {
  modelId: string;
  newModelBrand: string;
  newModelName: string;
  newModelTrim: string;
  newModelTransmission: string;
  newModelFuelType: string;
  newModelDriveType: string;
  newModelSeats: string;
  newModelYear: string;
  newModelFeatures: string;
  newModelDescription: string;
  categoryId: string;
  vin: string;
  plateNumber: string;
  color: string;
  status: CarStatus;
  mileage: string;
  hourlyPrice: string;
  dailyPrice: string;
  longTermDailyPrice: string;
  images: string;
};

type CarFormErrors = Partial<Record<keyof CarFormState, string>>;
type CreateCarSubmission = {
  payload: CreateCarPayload;
  model?: CreateModelPayload;
};

const initialCarForm: CarFormState = {
  modelId: '',
  newModelBrand: '',
  newModelName: '',
  newModelTrim: '',
  newModelTransmission: 'AUTOMATIC',
  newModelFuelType: 'GASOLINE',
  newModelDriveType: 'FWD',
  newModelSeats: '5',
  newModelYear: String(new Date().getFullYear()),
  newModelFeatures: '',
  newModelDescription: '',
  categoryId: '',
  vin: '',
  plateNumber: '',
  color: '',
  status: 'AVAILABLE',
  mileage: '',
  hourlyPrice: '',
  dailyPrice: '',
  longTermDailyPrice: '',
  images: '',
};

const carStatuses: CarStatus[] = ['AVAILABLE', 'RESERVED', 'ACTIVE', 'MAINTENANCE', 'DISABLED'];
const newModelValue = '__new_model__';

const defaultStartPoint = {
  address: 'Парковка CarShare, Тверская улица, 7',
  latitude: 55.751244,
  longitude: 37.618423,
};

const carFieldLabels: Record<keyof CarFormState, string> = {
  modelId: 'Модель',
  newModelBrand: 'Марка',
  newModelName: 'Название модели',
  newModelTrim: 'Комплектация',
  newModelTransmission: 'Коробка',
  newModelFuelType: 'Топливо',
  newModelDriveType: 'Привод',
  newModelSeats: 'Мест',
  newModelYear: 'Год',
  newModelFeatures: 'Особенности',
  newModelDescription: 'Описание модели',
  categoryId: 'Категория',
  vin: 'VIN',
  plateNumber: 'Госномер',
  color: 'Цвет',
  status: 'Статус',
  mileage: 'Пробег',
  hourlyPrice: 'Цена за час',
  dailyPrice: 'Цена за сутки',
  longTermDailyPrice: 'Цена долгой аренды',
  images: 'Изображения',
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [carFormOpen, setCarFormOpen] = useState(false);
  const [carForm, setCarForm] = useState<CarFormState>(initialCarForm);
  const [carFormErrors, setCarFormErrors] = useState<CarFormErrors>({});
  const [carApiError, setCarApiError] = useState('');
  const [adminCarsError, setAdminCarsError] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.admin.dashboard });
  const cars = useQuery({ queryKey: ['admin-cars'], queryFn: api.admin.cars });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: api.admin.users });
  const bookings = useQuery({ queryKey: ['admin-bookings'], queryFn: api.admin.bookings });
  const reviews = useQuery({ queryKey: ['admin-reviews'], queryFn: api.admin.reviews });
  const models = useQuery({ queryKey: ['admin-models'], queryFn: api.admin.models, enabled: tab === 'cars' });
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: api.admin.categories, enabled: tab === 'cars' });

  const patchCar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.admin.patchCar(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['cars-map'] });
    },
  });

  const deleteCar = useMutation({
    mutationFn: (id: string) => api.admin.deleteCar(id),
    onSuccess: () => {
      setAdminCarsError('');
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['cars-map'] });
    },
    onError: (error) => {
      setAdminCarsError(error instanceof Error ? error.message : 'Не удалось удалить авто');
    },
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => api.admin.deleteModel(id),
    onSuccess: () => {
      setAdminCarsError('');
      queryClient.invalidateQueries({ queryKey: ['admin-models'] });
    },
    onError: (error) => {
      setAdminCarsError(error instanceof Error ? error.message : 'Не удалось удалить модель');
    },
  });

  const createCar = useMutation({
    mutationFn: async ({ payload, model }: CreateCarSubmission) => {
      const modelId = model ? (await api.admin.createModel(model)).id : payload.modelId;
      return api.admin.createCar({ ...payload, modelId });
    },
    onSuccess: () => {
      setCarForm(initialCarForm);
      setCarFormErrors({});
      setCarApiError('');
      setCarFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      queryClient.invalidateQueries({ queryKey: ['admin-models'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['cars-map'] });
    },
    onError: (error) => {
      setCarApiError(error instanceof Error ? error.message : 'Не удалось добавить авто');
    },
  });

  const patchUser = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.admin.patchUser(id, { status: status as any }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const patchReview = useMutation({
    mutationFn: ({ id, moderationStatus }: { id: string; moderationStatus: string }) =>
      api.admin.patchCarReview(id, { moderationStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  function confirmDeleteCar(id: string, title: string) {
    if (window.confirm(`Удалить авто ${title}? Если у авто есть история бронирований, оно будет скрыто из каталога.`)) {
      deleteCar.mutate(id);
    }
  }

  function confirmDeleteModel(id: string, title: string) {
    if (window.confirm(`Удалить модель ${title}?`)) {
      deleteModel.mutate(id);
    }
  }

  function updateCarForm<Key extends keyof CarFormState>(key: Key, value: CarFormState[Key]) {
    setCarApiError('');
    setCarForm((current) => ({ ...current, [key]: value }));
    setCarFormErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function setUploadedImageUrls(urls: string[]) {
    setCarApiError('');
    setCarForm((current) => ({ ...current, images: urls.join('\n') }));
    setCarFormErrors((current) => {
      if (!current.images) {
        return current;
      }
      const next = { ...current };
      delete next.images;
      return next;
    });
  }

  function submitCarForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCarApiError('');

    const result = buildCreateCarPayload(carForm);
    if ('errors' in result) {
      setCarFormErrors(result.errors);
      return;
    }

    setCarFormErrors({});
    createCar.mutate(result);
  }

  async function uploadCarImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) {
      return;
    }

    setIsUploadingImages(true);
    setCarApiError('');
    try {
      const uploaded = await Promise.all(files.map((file) => api.admin.uploadCarImage(file)));
      const urls = uploaded.map((image) => image.url);
      setUploadedImageUrls([...imageUrls, ...urls]);
    } catch (error) {
      setCarApiError(error instanceof Error ? error.message : 'Не удалось загрузить изображения');
    } finally {
      setIsUploadingImages(false);
    }
  }

  const carValidationMessages = Object.entries(carFieldLabels).flatMap(([field, label]) => {
    const message = carFormErrors[field as keyof CarFormState];
    return message ? [`${label}: ${message}`] : [];
  });
  const imageUrls = getImageUrls(carForm.images);

  return (
    <section className="page adminPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Администрирование</p>
          <h1>Панель управления</h1>
        </div>
      </div>

      <div className="adminTabs">
        {[
          ['dashboard', 'Сводка'],
          ['cars', 'Авто'],
          ['users', 'Пользователи'],
          ['bookings', 'Брони'],
          ['reviews', 'Отзывы'],
        ].map(([value, label]) => (
          <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value as Tab)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' ? (
        <div className="statsGrid">
          <AdminStat label="Пользователи" value={dashboard.data?.users ?? 0} />
          <AdminStat label="Автомобили" value={dashboard.data?.cars ?? 0} />
          <AdminStat label="Активные брони" value={dashboard.data?.activeBookings ?? 0} />
          <AdminStat label="Завершено" value={dashboard.data?.completedTrips ?? 0} />
          <AdminStat label="Выручка" value={`${(dashboard.data?.revenue ?? 0).toLocaleString('ru-RU')} ₽`} />
        </div>
      ) : null}

      {tab === 'cars' ? (
        <>
          <div className="adminActionBar">
            <Button
              type="button"
              variant={carFormOpen ? 'secondary' : 'primary'}
              icon={carFormOpen ? <X size={18} /> : <Plus size={18} />}
              onClick={() => {
                setCarFormOpen((open) => !open);
                setCarApiError('');
                setCarFormErrors({});
              }}
            >
              {carFormOpen ? 'Скрыть форму' : 'Добавить авто'}
            </Button>
          </div>
          <FormSummary messages={[]} serverMessage={adminCarsError} />

          {carFormOpen ? (
            <form className="adminCreatePanel" onSubmit={submitCarForm} noValidate>
              <FormSummary messages={carValidationMessages} serverMessage={carApiError} />
              <div className="formGrid">
                <SelectField
                  label="Модель"
                  value={carForm.modelId}
                  error={carFormErrors.modelId}
                  onChange={(event) => updateCarForm('modelId', event.target.value)}
                >
                  <option value="">Выберите модель</option>
                  <option value={newModelValue}>Создать новую модель</option>
                  {(models.data ?? []).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.brand} {model.name} · {model.trim} · {model.year}
                    </option>
                  ))}
                </SelectField>
                {carForm.modelId === newModelValue ? (
                  <div className="adminModelFields formWide">
                    <Field
                      label="Марка"
                      value={carForm.newModelBrand}
                      error={carFormErrors.newModelBrand}
                      onChange={(event) => updateCarForm('newModelBrand', event.target.value)}
                    />
                    <Field
                      label="Модель"
                      value={carForm.newModelName}
                      error={carFormErrors.newModelName}
                      onChange={(event) => updateCarForm('newModelName', event.target.value)}
                    />
                    <Field
                      label="Комплектация"
                      value={carForm.newModelTrim}
                      error={carFormErrors.newModelTrim}
                      onChange={(event) => updateCarForm('newModelTrim', event.target.value)}
                    />
                    <SelectField
                      label="Коробка"
                      value={carForm.newModelTransmission}
                      error={carFormErrors.newModelTransmission}
                      onChange={(event) => updateCarForm('newModelTransmission', event.target.value)}
                    >
                      <option value="AUTOMATIC">Автомат</option>
                      <option value="MANUAL">Механика</option>
                    </SelectField>
                    <SelectField
                      label="Топливо"
                      value={carForm.newModelFuelType}
                      error={carFormErrors.newModelFuelType}
                      onChange={(event) => updateCarForm('newModelFuelType', event.target.value)}
                    >
                      <option value="GASOLINE">Бензин</option>
                      <option value="HYBRID">Гибрид</option>
                      <option value="ELECTRIC">Электро</option>
                    </SelectField>
                    <SelectField
                      label="Привод"
                      value={carForm.newModelDriveType}
                      error={carFormErrors.newModelDriveType}
                      onChange={(event) => updateCarForm('newModelDriveType', event.target.value)}
                    >
                      <option value="FWD">Передний</option>
                      <option value="RWD">Задний</option>
                      <option value="AWD">Полный</option>
                    </SelectField>
                    <Field
                      label="Мест"
                      inputMode="numeric"
                      value={carForm.newModelSeats}
                      error={carFormErrors.newModelSeats}
                      onChange={(event) => updateCarForm('newModelSeats', event.target.value)}
                    />
                    <Field
                      label="Год"
                      inputMode="numeric"
                      value={carForm.newModelYear}
                      error={carFormErrors.newModelYear}
                      onChange={(event) => updateCarForm('newModelYear', event.target.value)}
                    />
                    <Field
                      label="Особенности"
                      className="formWide"
                      value={carForm.newModelFeatures}
                      error={carFormErrors.newModelFeatures}
                      hint="Через запятую: климат-контроль, камера, подогрев руля."
                      onChange={(event) => updateCarForm('newModelFeatures', event.target.value)}
                    />
                    <Field
                      label="Описание модели"
                      className="formWide"
                      value={carForm.newModelDescription}
                      error={carFormErrors.newModelDescription}
                      onChange={(event) => updateCarForm('newModelDescription', event.target.value)}
                    />
                  </div>
                ) : null}
                <SelectField
                  label="Категория"
                  value={carForm.categoryId}
                  error={carFormErrors.categoryId}
                  onChange={(event) => updateCarForm('categoryId', event.target.value)}
                >
                  <option value="">Выберите категорию</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
                <Field
                  label="VIN"
                  value={carForm.vin}
                  error={carFormErrors.vin}
                  onChange={(event) => updateCarForm('vin', event.target.value.toUpperCase())}
                />
                <Field
                  label="Госномер"
                  value={carForm.plateNumber}
                  error={carFormErrors.plateNumber}
                  onChange={(event) => updateCarForm('plateNumber', event.target.value.toUpperCase())}
                />
                <Field
                  label="Цвет"
                  value={carForm.color}
                  error={carFormErrors.color}
                  onChange={(event) => updateCarForm('color', event.target.value)}
                />
                <SelectField
                  label="Статус"
                  value={carForm.status}
                  error={carFormErrors.status}
                  onChange={(event) => updateCarForm('status', event.target.value as CarStatus)}
                >
                  {carStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectField>
                <div className="adminFixedLocation formWide">
                  <MapPin size={19} />
                  <div>
                    <span>Стартовая точка</span>
                    <strong>{defaultStartPoint.address}</strong>
                    <small>
                      Новые автомобили всегда появляются на этой парковке. Координаты для карты подставляются автоматически.
                    </small>
                  </div>
                </div>
                <Field
                  label="Пробег"
                  inputMode="numeric"
                  suffix={<span>км</span>}
                  value={carForm.mileage}
                  error={carFormErrors.mileage}
                  onChange={(event) => updateCarForm('mileage', event.target.value)}
                />
                <Field
                  label="Цена за час"
                  inputMode="numeric"
                  suffix={<span>₽</span>}
                  value={carForm.hourlyPrice}
                  error={carFormErrors.hourlyPrice}
                  onChange={(event) => updateCarForm('hourlyPrice', event.target.value)}
                />
                <Field
                  label="Цена за сутки"
                  inputMode="numeric"
                  suffix={<span>₽</span>}
                  value={carForm.dailyPrice}
                  error={carFormErrors.dailyPrice}
                  onChange={(event) => updateCarForm('dailyPrice', event.target.value)}
                />
                <Field
                  label="Цена долгой аренды (от 7 суток)"
                  inputMode="numeric"
                  suffix={<span>₽/сутки</span>}
                  value={carForm.longTermDailyPrice}
                  error={carFormErrors.longTermDailyPrice}
                  onChange={(event) => updateCarForm('longTermDailyPrice', event.target.value)}
                />
                <div className={`field formWide ${carFormErrors.images ? 'fieldError' : ''}`}>
                  <span>Фото</span>
                  <label className={`button button-secondary adminUploadButton ${isUploadingImages ? 'disabled' : ''}`}>
                    <Upload size={18} />
                    <span>{isUploadingImages ? 'Загружаем...' : 'Выбрать фото'}</span>
                    <input
                      className="fileUploadInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      disabled={isUploadingImages}
                      onChange={uploadCarImages}
                    />
                  </label>
                  {carFormErrors.images ? <small className="fieldErrorText">{carFormErrors.images}</small> : null}
                  {imageUrls.length ? (
                    <div className="adminImagePreviewGrid">
                      {imageUrls.map((url) => (
                        <figure className="adminImagePreview" key={url}>
                          <img src={url} alt="Фото авто" />
                          <button
                            type="button"
                            aria-label="Удалить фото"
                            onClick={() => setUploadedImageUrls(imageUrls.filter((imageUrl) => imageUrl !== url))}
                          >
                            <Trash2 size={16} />
                          </button>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                  <small className="fieldHint">JPG, PNG, WebP или AVIF до 6 МБ.</small>
                </div>
              </div>
              <div className="adminFormActions">
                <Button type="button" variant="secondary" onClick={() => setCarForm(initialCarForm)}>
                  Очистить
                </Button>
                <Button
                  type="submit"
                  disabled={createCar.isPending || isUploadingImages || models.isLoading || categories.isLoading}
                >
                  {createCar.isPending ? 'Сохраняем...' : 'Сохранить авто'}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="adminSectionHeader">
            <h2>Автомобили</h2>
          </div>
          <div className="dataTable">
            {cars.data?.map((car) => (
              <div className="tableRow" key={car.id}>
                <div>
                  <strong>
                    {car.model.brand} {car.model.name}
                  </strong>
                  <span>
                    {car.plateNumber} · {car.color}
                  </span>
                </div>
                <div className="adminRowActions">
                  <Button
                    type="button"
                    variant="danger"
                    className="adminDeleteButton"
                    icon={<Trash2 size={19} />}
                    aria-label={`Удалить авто ${car.model.brand} ${car.model.name}`}
                    disabled={deleteCar.isPending}
                    onClick={() => confirmDeleteCar(car.id, `${car.model.brand} ${car.model.name}`)}
                  />
                  <SelectField
                    label="Статус"
                    value={car.status}
                    onChange={(event) => patchCar.mutate({ id: car.id, status: event.target.value })}
                  >
                    {carStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            ))}
          </div>

          <div className="adminSectionHeader">
            <h2>Модели</h2>
          </div>
          <div className="dataTable">
            {(models.data ?? []).map((model) => (
              <div className="tableRow" key={model.id}>
                <div>
                  <strong>
                    {model.brand} {model.name}
                  </strong>
                  <span>
                    {model.trim} · {model.year}
                  </span>
                </div>
                <div className="adminRowActions">
                  <Button
                    type="button"
                    variant="danger"
                    className="adminDeleteButton"
                    icon={<Trash2 size={19} />}
                    aria-label={`Удалить модель ${model.brand} ${model.name} ${model.trim}`}
                    disabled={deleteModel.isPending}
                    onClick={() => confirmDeleteModel(model.id, `${model.brand} ${model.name} · ${model.trim}`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'users' ? (
        <div className="dataTable">
          {users.data?.map((user) => (
            <div className="tableRow" key={user.id}>
              <div>
                <strong>{formatPersonName(user)}</strong>
                <span>{user.email}</span>
              </div>
              <SelectField
                label="Статус"
                value={user.status}
                onChange={(event) => patchUser.mutate({ id: user.id, status: event.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="BLOCKED">BLOCKED</option>
              </SelectField>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'bookings' ? (
        <div className="dataTable">
          {bookings.data?.map((booking) => (
            <div className="tableRow" key={booking.id}>
              <div>
                <strong>
                  {booking.car.model.brand} {booking.car.model.name}
                </strong>
                <span>
                  {formatPersonName(booking.user)} · {booking.totalAmount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'reviews' ? (
        <div className="dataTable">
          {reviews.data?.carReviews.map((review) => (
            <div className="tableRow" key={review.id}>
              <div>
                <strong>{formatPersonName(review.user)}</strong>
                <span>{review.text}</span>
              </div>
              <SelectField
                label="Модерация"
                value={review.moderationStatus}
                onChange={(event) => patchReview.mutate({ id: review.id, moderationStatus: event.target.value })}
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="PENDING">PENDING</option>
                <option value="HIDDEN">HIDDEN</option>
              </SelectField>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AdminStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildCreateCarPayload(form: CarFormState): CreateCarSubmission | { errors: CarFormErrors } {
  const errors: CarFormErrors = {};
  const mileage = Number(form.mileage);
  const hourlyPrice = Number(form.hourlyPrice);
  const dailyPrice = Number(form.dailyPrice);
  const longTermDailyPrice = Number(form.longTermDailyPrice);
  const newModelSeats = Number(form.newModelSeats);
  const newModelYear = Number(form.newModelYear);
  const newModelFeatures = form.newModelFeatures
    .split(',')
    .map((feature) => feature.trim())
    .filter(Boolean);
  const images = form.images
    .split(/[\n,]+/)
    .map((image) => image.trim())
    .filter(Boolean);

  const createsModel = form.modelId === newModelValue;
  if (!form.modelId) errors.modelId = 'выберите модель';
  if (createsModel) {
    if (!form.newModelBrand.trim()) errors.newModelBrand = 'введите марку';
    if (!form.newModelName.trim()) errors.newModelName = 'введите название модели';
    if (!form.newModelTrim.trim()) errors.newModelTrim = 'введите комплектацию';
    if (!Number.isInteger(newModelSeats) || newModelSeats < 1) errors.newModelSeats = 'введите целое число от 1';
    if (!Number.isInteger(newModelYear) || newModelYear < 1980 || newModelYear > 2100) {
      errors.newModelYear = 'введите год от 1980 до 2100';
    }
    if (!form.newModelDescription.trim()) errors.newModelDescription = 'добавьте описание модели';
  }
  if (!form.categoryId) errors.categoryId = 'выберите категорию';
  if (!form.vin.trim()) errors.vin = 'введите VIN';
  if (!form.plateNumber.trim()) errors.plateNumber = 'введите госномер';
  if (!form.color.trim()) errors.color = 'введите цвет';
  if (!Number.isInteger(mileage) || mileage < 0) errors.mileage = 'введите целое число от 0';
  if (!Number.isInteger(hourlyPrice) || hourlyPrice < 1) errors.hourlyPrice = 'введите целое число от 1';
  if (!Number.isInteger(dailyPrice) || dailyPrice < 1) errors.dailyPrice = 'введите целое число от 1';
  if (!Number.isInteger(longTermDailyPrice) || longTermDailyPrice < 1) {
    errors.longTermDailyPrice = 'введите целое число от 1';
  }
  if (images.length === 0) errors.images = 'добавьте хотя бы одно изображение';

  if (Object.keys(errors).length) {
    return { errors };
  }

  return {
    payload: {
      modelId: createsModel ? '' : form.modelId,
      categoryId: form.categoryId,
      vin: form.vin.trim(),
      plateNumber: form.plateNumber.trim(),
      color: form.color.trim(),
      status: form.status,
      latitude: defaultStartPoint.latitude,
      longitude: defaultStartPoint.longitude,
      address: defaultStartPoint.address,
      mileage,
      images,
      hourlyPrice,
      dailyPrice,
      longTermDailyPrice,
    },
    model: createsModel
      ? {
          brand: form.newModelBrand.trim(),
          name: form.newModelName.trim(),
          trim: form.newModelTrim.trim(),
          transmission: form.newModelTransmission,
          fuelType: form.newModelFuelType,
          driveType: form.newModelDriveType,
          seats: newModelSeats,
          year: newModelYear,
          features: newModelFeatures,
          description: form.newModelDescription.trim(),
        }
      : undefined,
  };
}

function getImageUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((image) => image.trim())
    .filter(Boolean);
}
