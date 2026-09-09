# API examples

Base URL: `http://localhost:3000/store/api`

```bash
curl http://localhost:3000/store/api/health
curl http://localhost:3000/store/api/products

curl -X POST http://localhost:3000/store/api/auth/dev-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@university.edu","password":"Demo123!"}'

curl http://localhost:3000/store/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST http://localhost:3000/store/api/cart/items \
  -H "Authorization: Bearer YOUR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2}'

curl -X POST http://localhost:3000/store/api/orders/checkout \
  -H "Authorization: Bearer YOUR_TOKEN"

curl http://localhost:3000/store/api/orders/1/status \
  -H 'x-api-key: YOUR_EXPOSED_PEER_API_KEY'
```
