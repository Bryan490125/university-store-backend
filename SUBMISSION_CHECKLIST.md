# Submission and demonstration checklist

## Team build

- [ ] Repository contains source code, Prisma schema, Docker files, and README.
- [ ] `.env` is ignored and no secrets appear in GitHub.
- [ ] Database migration and seed run successfully.
- [ ] Product/category, cart, checkout, order-history, and admin order APIs work.
- [ ] Student, staff, and admin permissions are demonstrated separately.
- [ ] Microsoft Entra ID login is demonstrated with a university account.
- [ ] Azure Key Vault secret retrieval is shown in production logs/configuration.
- [ ] AI description generation is demonstrated.
- [ ] Partner student verification and protected order-status APIs are demonstrated.
- [ ] Linux VPS URL uses `/store`, Nginx, HTTPS, and a valid certificate.
- [ ] Tests pass and invalid tokens/roles/API keys are rejected.

## Recommended screenshots

1. GitHub repository and project structure.
2. Prisma models or ERD.
3. Docker containers running.
4. Health endpoint through the public HTTPS URL.
5. Student product/cart/checkout flow.
6. Staff product creation and AI description response.
7. Admin order management.
8. A `403` response proving RBAC.
9. Peer API success and invalid-key rejection.
10. Key Vault secret list/role assignment without showing secret values.
11. Nginx configuration test and certificate.
12. Automated test results.

## Live demo order

1. Explain architecture and database relationships.
2. Open health and public product endpoints.
3. Log in as student, add an item, and check out.
4. Log in as staff and update stock/create a product.
5. Log in as admin and update order status.
6. Show AI and peer integrations.
7. Show rejected unauthorized requests.
8. Finish with deployment, HTTPS, tests, and limitations.
