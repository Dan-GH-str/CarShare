import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { List, Map, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { CarCard } from '../components/CarCard';
import { Field, SelectField } from '../components/Field';
import { MapCar } from '../types/domain';

type Filters = {
  driveType: string;
  color: string;
  transmission: string;
  fuelType: string;
  seats: string;
  minHourly: string;
  maxHourly: string;
  sort: string;
  available: string;
};

const initialFilters: Filters = {
  driveType: '',
  color: '',
  transmission: '',
  fuelType: '',
  seats: '',
  minHourly: '',
  maxHourly: '',
  sort: 'name',
  available: 'true',
};

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];
const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim();

type YandexMapInstance = {
  destroy: () => void;
  geoObjects: {
    add: (object: unknown) => void;
  };
  setBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void;
};

type YMapsNamespace = {
  ready: (callback: () => void) => void;
  Map: new (
    element: HTMLElement,
    state: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => YandexMapInstance;
  Placemark: new (
    coordinates: [number, number],
    properties: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
};

declare global {
  interface Window {
    __carShareYandexMapsPromise?: Promise<YMapsNamespace>;
    ymaps?: YMapsNamespace;
  }
}

export function CatalogPage() {
  const [category, setCategory] = useState('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const params = useMemo(() => {
    const next = new URLSearchParams({ category, limit: '50' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    return next;
  }, [category, filters]);

  const carsQuery = useQuery({
    queryKey: ['cars', params.toString()],
    queryFn: () => api.cars.list(params),
    refetchInterval: 15_000,
  });

  const mapQuery = useQuery({
    queryKey: ['cars-map', params.toString()],
    queryFn: () => api.cars.map(params),
    refetchInterval: 15_000,
    enabled: view === 'map',
  });

  const categories = [{ id: 'all', slug: 'all', name: 'Все', description: '', isActive: true }].concat(
    categoriesQuery.data ?? [],
  );

  return (
    <section className="page catalogPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Москва · каршеринг</p>
          <h1>Доступные автомобили</h1>
        </div>
        <Button
          variant="secondary"
          icon={<SlidersHorizontal size={18} />}
          onClick={() => setSheetOpen(true)}
          aria-label="Открыть фильтры"
        >
          Фильтры
        </Button>
      </div>

      <div className="categoryRail">
        {categories.map((item) => (
          <button
            className={item.slug === category ? 'active' : ''}
            key={item.id}
            onClick={() => setCategory(item.slug)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="catalogToolbar">
        <div>
          <span>Найдено</span>
          <strong>{carsQuery.data?.total ?? 0}</strong>
        </div>
        <div className="segmented">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="Список">
            <List size={18} />
          </button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')} aria-label="Карта">
            <Map size={18} />
          </button>
        </div>
      </div>

      {carsQuery.isLoading ? <div className="stateBlock">Загружаем каталог...</div> : null}
      {carsQuery.isError ? <div className="stateBlock error">Каталог временно недоступен</div> : null}

      {view === 'list' ? (
        <div className="carGrid">
          {carsQuery.data?.items.map((car) => <CarCard key={car.id} car={car} />)}
        </div>
      ) : (
        <CarMap cars={mapQuery.data ?? []} loading={mapQuery.isLoading} />
      )}

      {!carsQuery.isLoading && carsQuery.data?.items.length === 0 ? (
        <div className="stateBlock">Под такие фильтры машин не нашлось</div>
      ) : null}

      <FilterSheet
        open={sheetOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setSheetOpen(false)}
        onReset={() => setFilters(initialFilters)}
      />
    </section>
  );
}

function CarMap({ cars, loading }: { cars: MapCar[]; loading: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>(
    YANDEX_MAPS_API_KEY ? 'loading' : 'fallback',
  );

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) {
      setStatus('fallback');
      return;
    }

    const container = mapRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let mapInstance: YandexMapInstance | null = null;
    setStatus('loading');

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !mapRef.current) {
          return;
        }

        mapInstance = new ymaps.Map(
          mapRef.current,
          {
            center: getMapCenter(cars),
            controls: ['zoomControl', 'fullscreenControl'],
            zoom: cars.length ? 12 : 11,
          },
          { suppressMapOpenBlock: true },
        );

        cars.forEach((car) => {
          mapInstance?.geoObjects.add(
            new ymaps.Placemark(
              [car.latitude, car.longitude],
              {
                balloonContent: buildBalloonContent(car),
                iconCaption: car.title,
              },
              { preset: 'islands#tealAutoIcon' },
            ),
          );
        });

        if (cars.length > 1) {
          fitMapToCars(mapInstance, cars);
        }

        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('fallback');
        }
      });

    return () => {
      cancelled = true;
      mapInstance?.destroy();
    };
  }, [cars]);

  return (
    <div className="mapPanel">
      {loading ? <div className="mapLoading">Обновляем карту...</div> : null}
      {status === 'fallback' ? (
        <>
          <FallbackCarMap cars={cars} />
          <div className="mapNotice">Интерактивная карта временно недоступна, показываем схему расположения.</div>
        </>
      ) : (
        <div ref={mapRef} className="yandexMap" aria-label="Карта доступных автомобилей" />
      )}
      {status === 'loading' && !loading ? <div className="mapNotice">Загружаем карту...</div> : null}
      {status === 'ready' && cars.length === 0 ? <div className="mapNotice">Под эти фильтры машин на карте нет</div> : null}
    </div>
  );
}

function FallbackCarMap({ cars }: { cars: MapCar[] }) {
  const bounds = getCoordinateBounds(cars);

  return (
    <div className="mapFallback" aria-label="Схема расположения доступных автомобилей">
      <span className="fallbackRoad fallbackRoadMain" />
      <span className="fallbackRoad fallbackRoadRing" />
      <span className="fallbackRoad fallbackRoadDiagonal" />
      {cars.length ? (
        cars.map((car) => {
          const position = getFallbackPosition(car, bounds);

          return (
            <a
              aria-label={`${car.title}, ${car.hourlyPrice.toLocaleString('ru-RU')} рублей в час`}
              className="fallbackMarker"
              href={`/cars/${car.id}`}
              key={car.id}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <span />
              <strong>{car.title}</strong>
            </a>
          );
        })
      ) : (
        <div className="mapEmpty">Машины появятся на карте после загрузки каталога</div>
      )}
    </div>
  );
}

function loadYandexMaps() {
  if (!YANDEX_MAPS_API_KEY) {
    return Promise.reject(new Error('Yandex Maps API key is not configured'));
  }

  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (window.__carShareYandexMapsPromise) {
    return window.__carShareYandexMapsPromise;
  }

  window.__carShareYandexMapsPromise = new Promise<YMapsNamespace>((resolve, reject) => {
    const params = new URLSearchParams({
      apikey: YANDEX_MAPS_API_KEY,
      lang: 'ru_RU',
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps API did not initialize'));
        return;
      }

      window.ymaps.ready(() => resolve(window.ymaps!));
    };
    script.onerror = () => reject(new Error('Yandex Maps API failed to load'));
    document.head.appendChild(script);
  }).catch((error) => {
    delete window.__carShareYandexMapsPromise;
    throw error;
  });

  return window.__carShareYandexMapsPromise;
}

function getMapCenter(cars: MapCar[]): [number, number] {
  if (!cars.length) {
    return MOSCOW_CENTER;
  }

  const totals = cars.reduce(
    (acc, car) => ({ latitude: acc.latitude + car.latitude, longitude: acc.longitude + car.longitude }),
    { latitude: 0, longitude: 0 },
  );

  return [totals.latitude / cars.length, totals.longitude / cars.length];
}

function fitMapToCars(map: YandexMapInstance, cars: MapCar[]) {
  const bounds = getCoordinateBounds(cars);

  if (!bounds || (bounds.minLat === bounds.maxLat && bounds.minLng === bounds.maxLng)) {
    return;
  }

  map.setBounds(
    [
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    ],
    { checkZoomRange: true, zoomMargin: 42 },
  );
}

function getCoordinateBounds(cars: MapCar[]) {
  if (!cars.length) {
    return null;
  }

  return cars.reduce(
    (bounds, car) => ({
      maxLat: Math.max(bounds.maxLat, car.latitude),
      maxLng: Math.max(bounds.maxLng, car.longitude),
      minLat: Math.min(bounds.minLat, car.latitude),
      minLng: Math.min(bounds.minLng, car.longitude),
    }),
    {
      maxLat: cars[0].latitude,
      maxLng: cars[0].longitude,
      minLat: cars[0].latitude,
      minLng: cars[0].longitude,
    },
  );
}

function getFallbackPosition(car: MapCar, bounds: ReturnType<typeof getCoordinateBounds>) {
  if (!bounds) {
    return { x: 50, y: 50 };
  }

  const lngRange = bounds.maxLng - bounds.minLng || 0.01;
  const latRange = bounds.maxLat - bounds.minLat || 0.01;

  return {
    x: clamp(12 + ((car.longitude - bounds.minLng) / lngRange) * 76, 12, 88),
    y: clamp(88 - ((car.latitude - bounds.minLat) / latRange) * 76, 12, 88),
  };
}

function buildBalloonContent(car: MapCar) {
  return `
    <div class="mapPopup">
      <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" />
      <strong>${escapeHtml(car.title)}</strong>
      <span>${escapeHtml(car.trim)}</span>
      <b>${car.hourlyPrice.toLocaleString('ru-RU')} ₽/час</b>
      <a href="/cars/${encodeURIComponent(car.id)}">Детали</a>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char];
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function FilterSheet({
  open,
  filters,
  onChange,
  onReset,
  onClose,
}: {
  open: boolean;
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  function update<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <aside className={`filterSheet ${open ? 'open' : ''}`}>
      <div className="sheetHandle" />
      <header className="sheetHeader">
        <h2>Фильтры</h2>
        <Button variant="ghost" icon={<X size={18} />} aria-label="Закрыть фильтры" onClick={onClose} />
      </header>
      <div className="filterGrid">
        <SelectField label="Привод" value={filters.driveType} onChange={(event) => update('driveType', event.target.value)}>
          <option value="">Любой</option>
          <option value="FWD">Передний</option>
          <option value="RWD">Задний</option>
          <option value="AWD">Полный</option>
        </SelectField>
        <SelectField label="Топливо" value={filters.fuelType} onChange={(event) => update('fuelType', event.target.value)}>
          <option value="">Любое</option>
          <option value="GASOLINE">Бензин</option>
          <option value="HYBRID">Гибрид</option>
          <option value="ELECTRIC">Электро</option>
        </SelectField>
        <SelectField
          label="Коробка"
          value={filters.transmission}
          onChange={(event) => update('transmission', event.target.value)}
        >
          <option value="">Любая</option>
          <option value="AUTOMATIC">Автомат</option>
          <option value="MANUAL">Механика</option>
        </SelectField>
        <Field label="Цвет" value={filters.color} onChange={(event) => update('color', event.target.value)} />
        <Field
          label="Мест"
          inputMode="numeric"
          value={filters.seats}
          onChange={(event) => update('seats', event.target.value)}
        />
        <Field
          label="Цена от"
          inputMode="numeric"
          value={filters.minHourly}
          suffix={<span>₽/ч</span>}
          onChange={(event) => update('minHourly', event.target.value)}
        />
        <Field
          label="Цена до"
          inputMode="numeric"
          value={filters.maxHourly}
          suffix={<span>₽/ч</span>}
          onChange={(event) => update('maxHourly', event.target.value)}
        />
        <SelectField label="Сортировка" value={filters.sort} onChange={(event) => update('sort', event.target.value)}>
          <option value="name">Название</option>
          <option value="priceAsc">Сначала дешевле</option>
          <option value="priceDesc">Сначала дороже</option>
          <option value="rating">Рейтинг</option>
        </SelectField>
      </div>
      <label className="toggleRow">
        <input
          type="checkbox"
          checked={filters.available === 'true'}
          onChange={(event) => update('available', event.target.checked ? 'true' : '')}
        />
        <span>Только доступные</span>
      </label>
      <footer className="sheetActions">
        <Button variant="secondary" onClick={onReset}>
          Сбросить
        </Button>
        <Button onClick={onClose}>Применить</Button>
      </footer>
    </aside>
  );
}
