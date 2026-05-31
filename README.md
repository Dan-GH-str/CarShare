# CarShare

Учебное full-stack веб-приложение каршеринга по `PLAN.md` и `TASKS.md`.

## Стек

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Яндекс.Карты JS API.
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, JWT access/refresh flow.
- Infra: Docker Compose для PostgreSQL.

## Быстрый запуск

1. Установить Node.js 20+ и Docker.
2. Скопировать переменные окружения:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Для интерактивной карты укажите `VITE_YANDEX_MAPS_API_KEY` в `.env` или `frontend/.env`. Без ключа каталог покажет встроенную схему расположения автомобилей.

3. Установить зависимости:

```bash
npm install
```

4. Поднять PostgreSQL:

```bash
npm run db:up
```

5. Подготовить базу:

```bash
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run prisma:seed -w backend
```

6. Запустить приложение:

```bash
npm run dev
```

Frontend откроется на `http://localhost:5173`, API и Swagger - на `http://localhost:3001` и `http://localhost:3001/docs`.

## Seed-аккаунты

- Пользователь: `user@carshare.local` / `Password123!`
- Администратор: `admin@carshare.local` / `Password123!`

## Основные сценарии

- Каталог автомобилей со списком, картой, категориями и фильтрами.
- Страница автомобиля с тарифами, опциями, расчетом и отзывами.
- Регистрация, вход, refresh-token flow и профиль.
- Создание бронирования, выбор старта сейчас или на запланированное время, старт, отмена и завершение поездки.
- Жизненный цикл бронирования: `RESERVED` удерживает автомобиль, `ACTIVE` запускает тарификацию, при пропуске окна старта бронь истекает.
- Отмена до старта: бесплатно в первые 5 минут или раньше чем за 30 минут до старта, поздняя отмена и платное ожидание попадают в чек удержания.
- Автоматическое формирование чека после завершения поездки, платной отмены или no-show.
- Админ-панель со сводкой, пользователями, автомобилями, бронированиями и отзывами.
- Регистрация и профиль хранят фамилию, имя и отчество отдельными полями.

## Проверка

В текущем срезе проходили сборки frontend/backend и backend unit-тесты. Для применения новых полей бронирования к локальной базе после запуска PostgreSQL выполните:

```bash
npm run prisma:migrate -w backend
```
