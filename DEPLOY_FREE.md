# Free deployment checklist

Recommended free stack for this project:

- Database: Neon Free Postgres.
- Backend API: Render Free Web Service.
- Frontend: Vercel Hobby static deployment.

Render also has free Postgres, but it expires after 30 days. Use it only for a temporary demo.

## 1. Prepare the repository

Push the project to GitHub. Do not commit `.env` files.

Useful local checks before deploy:

```bash
npm install
npm run build -w backend
npm run build -w frontend
npm run test -w backend
```

## 2. Create the free Postgres database on Neon

1. Create a Neon account.
2. Create a new project.
3. Copy the pooled connection string.
4. Make sure the URL starts with `postgresql://` and includes `?sslmode=require`.

This value will be used as `DATABASE_URL` for the backend.

## 3. Deploy backend on Render

1. Create a Render account.
2. Connect your GitHub repository.
3. Use the repository Blueprint if Render offers it, or create a Web Service manually.
4. For manual setup:
   - Runtime: Node.
   - Instance type: Free.
   - Root directory: leave empty or use repository root.
   - Build command:

```bash
npm ci --include=dev && npm run prisma:generate -w backend && npm run build -w backend
```

   - Start command:

```bash
npm run prisma:migrate:deploy -w backend && npm run start -w backend
```

5. Add environment variables:
   - `DATABASE_URL`: Neon pooled connection string.
   - `JWT_ACCESS_SECRET`: long random string.
   - `JWT_REFRESH_SECRET`: another long random string.
   - `ACCESS_TOKEN_TTL`: `15m`.
   - `REFRESH_TOKEN_TTL_DAYS`: `30`.
   - `NODE_ENV`: `production`.
   - `NODE_VERSION`: `20`.

After the first successful deploy, copy the Render backend URL, for example:

```text
https://carshare-api.onrender.com
```

## 4. Seed demo data

Run this once from your local machine with the production Neon URL:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
npm run prisma:seed -w backend
```

Do not run seed on every backend start, because the current seed can create duplicate tariffs.

## 5. Deploy frontend on Vercel

1. Create a Vercel account.
2. Import the same GitHub repository.
3. Set the project root directory to `frontend`.
4. Framework preset: Vite.
5. Build command:

```bash
npm run build
```

6. Output directory:

```text
dist
```

7. Add environment variables:
   - `VITE_API_URL`: your Render backend URL, without trailing slash.
   - `VITE_YANDEX_MAPS_API_KEY`: optional.

Deploy. The app should now open from the Vercel URL and call the Render API.

## 6. Important free-tier limitations

- Render Free Web Services can spin down when idle, so the first request after a pause may be slow.
- Render Free Web Services have an ephemeral filesystem. Uploaded car images stored in `backend/uploads` can disappear after redeploys or restarts.
- For persistent image uploads, add a free external storage provider later, for example Cloudinary or Supabase Storage.
- Keep Neon usage small on the Free plan; it is enough for a demo or coursework project.
