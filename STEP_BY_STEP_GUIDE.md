# Complete step-by-step guide

Use this guide in order. Do not deploy until the local tests pass.

## Part 1 - Run on your Mac

Prerequisites: Docker Desktop running, Node.js 22 or newer, and Terminal.

```bash
cd ~/Downloads
unzip University_Ecommerce_Backend_Complete.zip
cd university-store-backend
cp .env.example .env
openssl rand -base64 48
openssl rand -hex 32
```

Open `.env`. Put the first generated value in `JWT_SECRET` and the second in `EXPOSED_PEER_API_KEY`. Keep `DEV_LOGIN_ENABLED=true` locally.

```bash
chmod +x scripts/*.sh deploy/deploy.sh
./scripts/local_setup.sh
./scripts/smoke_test.sh
npm test
```

Open:

- API health: `http://localhost:3000/store/api/health`
- Interactive docs: `http://localhost:3000/store/api/docs`

Stop later with `docker compose down`. Use `docker compose down -v` only when you intentionally want to erase the local database.

## Part 2 - Push to GitHub

Create an empty private repository, then run:

```bash
git init
git add .
git commit -m "Complete university merchandise store backend"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Check that `.env` does not appear on GitHub. The included GitHub Actions workflow should pass.

## Part 3 - Microsoft Entra ID

1. Open Microsoft Entra admin center, then App registrations > New registration.
2. Name it `University Store API` and select accounts in this organizational directory only.
3. Copy the Application (client) ID and Directory (tenant) ID.
4. Open Expose an API, accept `api://CLIENT_ID`, and add delegated scope `Store.Access`.
5. Set the production environment:

```env
AZURE_TENANT_ID=your-directory-tenant-id
AZURE_CLIENT_ID=your-api-client-id
AZURE_AUDIENCE=api://your-api-client-id
```

The client application must request `api://CLIENT_ID/Store.Access`. The backend verifies the token signature, issuer, and audience. A newly authenticated user is created as `STUDENT`; an administrator can change the role using `PATCH /admin/users/{id}/role`.

## Part 4 - Azure Key Vault

Use your existing resource group, VM, and vault where possible. Replace every angle-bracket placeholder.

```bash
az login
az vm identity assign --resource-group <resource-group> --name bad-vps-01
```

Copy the returned `principalId`, then grant it access:

```bash
VAULT_ID=$(az keyvault show --name <vault-name> --resource-group <resource-group> --query id -o tsv)
az role assignment create --assignee <principalId> --role "Key Vault Secrets User" --scope "$VAULT_ID"
```

Create secrets without placing them in Git:

```bash
az keyvault secret set --vault-name <vault-name> --name database-url --value '<production-database-url>'
az keyvault secret set --vault-name <vault-name> --name jwt-secret --value '<long-random-jwt-secret>'
az keyvault secret set --vault-name <vault-name> --name openai-api-key --value '<openai-key>'
az keyvault secret set --vault-name <vault-name> --name partner-api-key --value '<outbound-partner-key>'
az keyvault secret set --vault-name <vault-name> --name exposed-peer-api-key --value '<different-inbound-key>'
```

On the VM, `.env` needs the vault URL and non-secret configuration only:

```env
NODE_ENV=production
PORT=3000
BASE_PATH=/store
DEV_LOGIN_ENABLED=false
KEY_VAULT_URL=https://<vault-name>.vault.azure.net
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_AUDIENCE=api://<client-id>
OPENAI_MODEL=gpt-4.1-mini
PARTNER_API_BASE_URL=https://partner.example.com
CORS_ORIGIN=https://your-domain.example
```

## Part 5 - Deploy to the Azure VM

SSH into the VM, clone the private repository, and enter the folder. Install Docker Engine/Compose if they are not already installed. Then run:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api
curl http://127.0.0.1:3000/store/api/health
```

For a real submission, use a production MySQL password/database URL rather than the local values in `docker-compose.yml`.

## Part 6 - Nginx and HTTPS

Place the contents of `deploy/nginx.conf` inside the existing HTTPS server block. This preserves the previous `/content` and `/api` routes while adding `/store`.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl https://YOUR_DOMAIN/store/api/health
```

If the domain does not already have HTTPS:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d YOUR_DOMAIN
sudo certbot renew --dry-run
```

## Part 7 - OpenAI integration

The endpoint uses the OpenAI Responses API through the official JavaScript SDK. Store the key in Key Vault, not `.env` or GitHub.

1. Login as staff or admin.
2. Call `POST /store/api/integrations/ai/product-description`.
3. Body example: `{"name":"University Hoodie","features":"soft cotton, navy blue, embroidered logo"}`.
4. Copy the returned description into the product creation request after staff reviews it.

## Part 8 - Peer API

Agree on two different keys with the partner team:

- `PARTNER_API_KEY`: your backend sends this to their student verification endpoint.
- `EXPOSED_PEER_API_KEY`: their backend sends this to your order-status endpoint.

Never use the same key in both directions. Test invalid and valid keys and capture both responses.

## Part 9 - Final evidence

Follow `SUBMISSION_CHECKLIST.md`. Capture screenshots only after the public HTTPS URL works. Never show tokens, passwords, Key Vault secret values, `.env`, or private keys in screenshots.
