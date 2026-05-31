const labels: Record<string, string> = {
  AVAILABLE: 'Доступен',
  RESERVED: 'Бронь',
  ACTIVE: 'В поездке',
  MAINTENANCE: 'Сервис',
  DISABLED: 'Скрыт',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
  EXPIRED: 'Истекла',
  PUBLISHED: 'Опубликован',
  HIDDEN: 'Скрыт',
  BLOCKED: 'Заблокирован',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>;
}
