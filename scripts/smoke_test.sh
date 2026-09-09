#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000/store/api}"

echo "1. Health"
curl -fsS "$BASE_URL/health"

echo "2. Public products"
curl -fsS "$BASE_URL/products"

echo "3. Student login"
LOGIN_JSON="$(curl -fsS -X POST "$BASE_URL/auth/dev-login" -H 'Content-Type: application/json' -d '{"email":"student@university.edu","password":"Demo123!"}')"
TOKEN="$(node -e 'const d=JSON.parse(process.argv[1]); if(!d.token) process.exit(1); process.stdout.write(d.token)' "$LOGIN_JSON")"

echo "4. Add product to cart"
curl -fsS -X POST "$BASE_URL/cart/items" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"productId":1,"quantity":1}'

echo "5. Checkout"
curl -fsS -X POST "$BASE_URL/orders/checkout" -H "Authorization: Bearer $TOKEN"

echo "6. Order history"
curl -fsS "$BASE_URL/orders/mine" -H "Authorization: Bearer $TOKEN"
echo

echo "7. Admin login"
ADMIN_LOGIN="$(curl -fsS -X POST "$BASE_URL/auth/dev-login" -H 'Content-Type: application/json' -d '{"email":"admin@university.edu","password":"Demo123!"}')"
ADMIN_TOKEN="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.token)' "$ADMIN_LOGIN")"

echo "8. Admin summary report"
curl -fsS "$BASE_URL/admin/reports/summary" -H "Authorization: Bearer $ADMIN_TOKEN"
echo

echo "9. Admin update order status to CONFIRMED"
curl -fsS -X PATCH "$BASE_URL/orders/1/status" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"CONFIRMED"}'
echo

echo "10. RBAC rejection checks"
# Student cannot view admin report (expect 403)
STATUS_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/reports/summary" -H "Authorization: Bearer $TOKEN")"
if [[ "$STATUS_CODE" -ne 403 ]]; then
  echo "Expected 403 for student accessing admin report, got $STATUS_CODE" >&2
  exit 1
fi
echo "  ✓ Student forbidden from admin reports (403)"

# Missing token (expect 401)
STATUS_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/cart")"
if [[ "$STATUS_CODE" -ne 401 ]]; then
  echo "Expected 401 for missing token, got $STATUS_CODE" >&2
  exit 1
fi
echo "  ✓ Missing token rejected (401)"

# Peer API with invalid key (expect 401)
STATUS_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/orders/1/status" -H 'x-api-key: invalid-key')"
if [[ "$STATUS_CODE" -ne 401 ]]; then
  echo "Expected 401 for invalid peer key, got $STATUS_CODE" >&2
  exit 1
fi
echo "  ✓ Invalid peer key rejected (401)"

PEER_KEY="$(grep '^EXPOSED_PEER_API_KEY=' .env | cut -d '=' -f2-)"
if [[ -n "$PEER_KEY" ]]; then
  echo "11. Peer API order status (valid key)"
  curl -fsS "$BASE_URL/orders/1/status" -H "x-api-key: $PEER_KEY"
  echo
fi

echo "All Phase 2 smoke tests passed successfully!"
