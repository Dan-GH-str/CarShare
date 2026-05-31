# Основные API endpoints

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

`POST /auth/register` принимает `lastName`, `firstName`, `middleName`, `email`, `phone`, `password`.

## Catalog

- `GET /categories`
- `GET /cars`
- `GET /cars/map`
- `GET /cars/:id`
- `GET /cars/:id/reviews`
- `POST /cars/:id/reviews`

## Bookings and Trips

- `POST /bookings/quote`
- `POST /bookings`
- `GET /bookings/active`
- `POST /bookings/:id/start`
- `POST /bookings/:id/finish`
- `POST /bookings/:id/cancel`
- `GET /trips/my`

`POST /bookings/quote` и `POST /bookings` принимают `carId`, `rateType`, `units`, `optionIds` и опциональный `startAt`. Если `startAt` не передан, бронирование считается стартующим сейчас. Если `startAt` передан, поездка планируется на указанную дату и время. Допустимые значения `units`: `HOURLY` от 1 до 23 часов, `DAILY` от 1 до 6 суток, `LONG_TERM` от 7 до 30 дней.

`POST /bookings/:id/start` переводит бронь из `RESERVED` в `ACTIVE`, фиксирует `actualStartAt` и проверяет окно старта: не раньше чем за 10 минут до `startAt`, не позже `expiresAt`.

Для бронирования сервер рассчитывает `freeWaitUntil`, `expiresAt` и `waitAmount`: первые 15 минут после `startAt` ожидание бесплатное, затем начисляется платное удержание автомобиля, а через 30 минут без старта бронь становится `EXPIRED`.

`POST /bookings/:id/cancel` доступен только для `RESERVED`. Отмена бесплатна в первые 5 минут после создания брони или если до `startAt` больше 30 минут. При поздней отмене до старта удерживается 100 руб.; после `startAt` удерживается только платное ожидание после бесплатных 15 минут. Ответ содержит обновленное бронирование, расчет удержания и чек, если удержание больше 0.

## Receipts and Reviews

- `GET /receipts/:id`
- `POST /service-reviews`

## Admin

- `GET /admin/dashboard`
- `GET/PATCH /admin/users`
- `GET/POST/PATCH/DELETE /admin/cars`
- `GET/POST/PATCH/DELETE /admin/categories`
- `GET/POST/PATCH/DELETE /admin/models`
- `GET/POST/PATCH/DELETE /admin/tariffs`
- `GET/POST/PATCH/DELETE /admin/options`
- `GET/PATCH /admin/bookings`
- `GET/PATCH /admin/reviews`
