# University E-Commerce & Merchandise Store Backend

Prepared for the Backend Application project by Phone Maung (6632110), Nyi Min Htet (6622132), and Kemmarat Kemsirirat (6610914).

## Included

- Express REST API under `/store/api`
- MySQL + Prisma schema: users, roles, categories, products, carts, orders
- Student, staff, and admin RBAC
- Microsoft Entra ID token verification plus development-only login
- Atomic checkout and stock protection
- OpenAI product-description endpoint
- Protected peer API consume/expose examples
- Helmet, rate limiting, validation, soft product deletion, and generic production errors
- Docker Compose, Nginx route, deployment script, seed data, and smoke tests
- Interactive Swagger UI at `/store/api/docs`
- Admin user roles and summary reports
- Runtime Azure Key Vault secret loading with managed identity
- Production UI served by Nginx at the site root, with the API at `/store/api`

## Run locally

1. Copy `.env.example` to `.env` and replace both example secret values.
2. Start MySQL: `docker compose up -d db`.
3. Run `npm install`.
4. Run `npx prisma generate && npx prisma db push && npm run db:seed`.
5. Start: `npm run dev`.
6. Test `http://localhost:3000/store/api/health`.

The frontend uses role buttons for the controlled classroom/demo flow, so users do not enter email addresses or passwords. Set `ROLE_LOGIN_ENABLED=true` on the API and seed the database before using those buttons. This mode identifies the first configured user for each role and is not suitable for an internet-facing production system; use Microsoft Entra ID for real deployment.

## Production checklist

1. Create the Microsoft Entra app registration and expose an API scope.
2. Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_AUDIENCE`.
3. Put database URL, JWT secret, peer keys, and OpenAI key in Azure Key Vault; grant the VM managed identity `Key Vault Secrets User`.
4. Set `DEV_LOGIN_ENABLED=false` and `NODE_ENV=production`.
5. Create a real Prisma migration: `npx prisma migrate dev --name init`, commit it, and deploy using `npx prisma migrate deploy`.
6. Copy `deploy/nginx.conf` into the existing HTTPS server block, run `sudo nginx -t`, then reload Nginx.
7. Use Certbot on the real domain. Do not request a certificate for an IP address.
8. Configure the partner API URL and exchange different inbound/outbound API keys securely.
9. Run `npm test`, demonstrate all three roles, and capture screenshots/logs for the report.

## VPS URLs

After pointing your domain to the VPS and configuring HTTPS in Nginx:

- UI: `https://your-domain.example/`
- API health: `https://your-domain.example/store/api/health`
- API docs: `https://your-domain.example/store/api/docs`

Build the frontend with `VITE_API_URL=https://your-domain.example/store/api npm run build` from `frontend/`, then copy `frontend/dist` to `/var/www/university-store-frontend/dist`. Set `CORS_ORIGIN=https://your-domain.example` in the API environment.

## Important limits

Real cloud activation requires your Azure tenant, Key Vault, VPS/domain, OpenAI key, and partner team's API contract. Never commit `.env`. For production, replace permissive CORS with the exact frontend origin and rotate all demo/example credentials.

See `API_EXAMPLES.md` for demonstration commands.
See `STEP_BY_STEP_GUIDE.md` for the complete Mac, Azure, Key Vault, Nginx, HTTPS, AI, and peer-API workflow.
