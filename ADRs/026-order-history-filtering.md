Title: Order History Filtering & Search
Date: 2025-12-02

Context
-------
Checkpoint 4 requires a lightweight order-history filtering and search feature that lets users filter by status, date-range and keyword (product name OR order id). The app uses Node/Express + Prisma on backend and React (Vite) on the frontend.

Decision
--------
- Add query parameters to the purchases endpoint: `status`, `startDate`, `endDate`, and `keyword`.
- Implement server-side dynamic Prisma `findMany` filters that combine explicit `where` filters with an `OR` block for keyword searches.
- Use `contains` searches for product title (case-insensitive) and sale id (UUID partial-match) to support partial ID lookups.
- Keep API lightweight: no heavy full-text index or external search service for this checkpoint.
- Frontend `ReturnRefunds` component exposes a dropdown (status), two date inputs (start/end) and a search box; it sends `keyword` to the backend.

Consequences
------------
- Pros:
  - Quick to implement and easy for users to narrow results.
  - No external dependencies added (keeps the app simple for Checkpoint 4).
- Cons:
  - `contains` queries may be slower on large tables without appropriate indexes.

Indexes & Migrations (recommended next step)
-------------------------------------------
To keep filter/search responsive with larger data volumes, add database indexes and run migrations:

- Add an index for product title in `prisma/schema.prisma` (on `Product.title`). Example:

  model Product {
    id    String @id @default(uuid())
    title String
    // ...

    @@index([title])
  }

- Optionally add a functional trigram / full text index at the DB level if you intend to scale search performance.

Testing
-------
- Add integration tests covering:
  - `status` filter
  - `startDate`/`endDate` range
  - `keyword` searching by product title and by order id (partial)

UML / Docs
----------
- Update the order-history sequence diagram to show the client building a request with `status`, `startDate`, `endDate`, and `keyword` and the server returning filtered purchases.
- This ADR is coupled with a small note added to the project completion report to mention the new endpoint parameters.

Rollout
-------
- Backend changes are backwards-compatible: we accept `q` as an alias for `keyword` for a transition period.
- Deploy backend and frontend together to ensure the UI uses the `keyword` parameter.

Notes
-----
- This implementation intentionally avoids pagination; for large datasets add `page` and `limit` params and return total counts.
- Consider upgrading the backend Node base image to Node 20 to resolve supabase-js deprecation warnings (separate task).
