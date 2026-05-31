import { Link } from 'react-router-dom';
import { Gauge, MapPin, Star } from 'lucide-react';
import { Car } from '../types/domain';
import { StatusBadge } from './StatusBadge';

export function CarCard({ car }: { car: Car }) {
  return (
    <article className="carCard">
      <img src={car.images[0]} alt={`${car.title} ${car.model.trim}`} loading="lazy" />
      <div className="carCardBody">
        <div className="cardTopline">
          <span className="chip">{car.category.name}</span>
          <StatusBadge status={car.status} />
        </div>
        <h3>{car.title}</h3>
        <p>{car.model.trim}</p>
        <div className="carMeta">
          <span>
            <Star size={15} />
            {car.rating} · {car.reviewCount || 'нет'} отзывов
          </span>
          <span>
            <Gauge size={15} />
            {fuelLabel(car.model.fuelType)}
          </span>
          <span>
            <MapPin size={15} />
            {car.address}
          </span>
        </div>
        <div className="priceRow">
          <div>
            <strong>{car.tariff.hourlyPrice.toLocaleString('ru-RU')} ₽</strong>
            <span>/ час</span>
          </div>
          <div>
            <strong>{car.tariff.dailyPrice.toLocaleString('ru-RU')} ₽</strong>
            <span>/ сутки</span>
          </div>
          <Link className="button button-primary cardAction" to={`/cars/${car.id}`}>
            Детали
          </Link>
        </div>
      </div>
    </article>
  );
}

function fuelLabel(fuelType: string) {
  const labels: Record<string, string> = {
    GASOLINE: 'Бензин',
    HYBRID: 'Гибрид',
    ELECTRIC: 'Электро',
  };

  return labels[fuelType] ?? fuelType;
}
