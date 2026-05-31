import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export function NotFoundPage() {
  return (
    <section className="stateBlock">
      <h1>404</h1>
      <p>Страница не найдена</p>
      <Link className="button button-primary" to="/">
        В каталог
      </Link>
    </section>
  );
}

export function ForbiddenPage() {
  return (
    <section className="stateBlock">
      <h1>Нет доступа</h1>
      <p>Для этого раздела нужны права администратора</p>
      <Link className="button button-primary" to="/">
        В каталог
      </Link>
    </section>
  );
}

export function ServerErrorPage() {
  return (
    <section className="stateBlock">
      <h1>Ошибка сервера</h1>
      <p>Попробуйте повторить запрос позднее</p>
      <Button onClick={() => window.location.reload()}>Обновить</Button>
    </section>
  );
}
