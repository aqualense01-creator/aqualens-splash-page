# Load Smoke Testing

This repository includes a lightweight, dependency-free load smoke harness for checking the web app against a configured URL.

Run it locally:

```sh
npm run test:load
```

By default it targets `http://127.0.0.1:5173`, runs for 15 seconds at concurrency 4, and exercises public auth routes plus unauthenticated protected app/admin routes. It does not use credentials or secrets.

Useful knobs:

```sh
LOAD_BASE_URL=https://example.com npm run test:load
LOAD_DURATION_SECONDS=30 LOAD_CONCURRENCY=8 npm run test:load
LOAD_TIMEOUT_MS=10000 LOAD_MAX_P95_MS=5000 npm run test:load
LOAD_ROUTES=/,/login,/app/dashboard npm run test:load
```

The harness reports request rate, status counts, route-level latency, and latency percentiles. It fails on 5xx responses, timeouts, network errors, unexpected statuses, or a p95 latency above `LOAD_MAX_P95_MS`.
