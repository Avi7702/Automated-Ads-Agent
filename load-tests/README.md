# Load Tests — Automated Ads Agent

Load testing suite using [k6](https://grafana.com/docs/k6/latest/) by Grafana Labs.

## Prerequisites

### Install k6

**Windows (winget):**
```bash
winget install k6 --source winget
```

**Windows (Chocolatey):**
```bash
choco install k6
```

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

Verify installation:
```bash
k6 version
```

## Test Scripts

| Script | Description | VUs | Duration | Purpose |
|--------|-------------|-----|----------|---------|
| `baseline.js` | Normal traffic simulation | 100 | 5 min | Establish performance baselines |
| `spike.js` | Sudden traffic surge | 0-500 | ~3 min | Validate rate limiting and graceful degradation |
| `soak.js` | Extended steady load | 50 | 30 min | Detect memory leaks and response time drift |
| `auth-flow.js` | Full auth lifecycle | 50 | ~3 min | Validate session handling under load |

## Running Tests

### Against Local Development Server

Start the server first:
```bash
npm run dev
```

Then run any test:
```bash
k6 run load-tests/baseline.js
k6 run load-tests/spike.js
k6 run load-tests/soak.js
k6 run load-tests/auth-flow.js
```

### Against Production

```bash
k6 run --env BASE_URL=https://automated-ads-agent-production.up.railway.app load-tests/baseline.js
```

### With Docker

```bash
docker run --rm -i grafana/k6 run - < load-tests/baseline.js
```

For local server from Docker (use host networking):
```bash
docker run --rm -i --network host grafana/k6 run - < load-tests/baseline.js
```

## Thresholds

### Baseline Test
| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Read endpoint p95 | < 500ms | Fast reads are critical for UX |
| AI endpoint p95 | < 5s | Gemini calls are inherently slower |
| Error rate | < 1% | Near-zero errors under normal load |

### Spike Test
| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Server 5xx errors | 0 | No unhandled crashes; 503 rate-limit is OK |
| Read endpoint p95 | < 2s | Reads should degrade gracefully |
| Error rate | < 30% | Rate limiting will reject many requests (429) |

### Soak Test
| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Read endpoint p95 | < 1s | Must stay stable over 30 minutes |
| Health p99 | < 200ms | Canary for system degradation |
| Error rate | < 1% | No drift over extended period |

### Auth Flow Test
| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Full auth flow p95 | < 3s | End-to-end auth should be fast |
| Login p95 | < 1s | Login is performance-critical |
| Session errors | < 5 | Sessions must be reliable |

## Interpreting Results

k6 prints a summary at the end of each run. Key things to look for:

1. **Threshold failures** - Marked with a cross; indicates the system did not meet the performance requirement.
2. **http_req_duration** - Overall request latency distribution (min, med, avg, p90, p95, max).
3. **http_req_failed** - Percentage of requests that returned a non-2xx/3xx status.
4. **Custom metrics** - `read_endpoint_duration`, `ai_endpoint_duration`, etc. provide per-category breakdowns.
5. **iterations** - Total number of complete VU iterations (throughput).

### Example Output
```
     scenarios: (100.00%) 1 scenario, 100 max VUs, 5m30s max duration
     ...
     ✓ read_endpoint_duration...: avg=45ms  min=12ms  p(95)=234ms  max=890ms
     ✓ ai_endpoint_duration.....: avg=2.3s  min=800ms p(95)=4.1s   max=7.2s
     ✓ error_rate...............: 0.23%     ✓ < 1%
     ✓ http_req_failed..........: 0.18%     ✓ < 1%
```

## Exporting Results

### JSON output (for CI/CD pipelines):
```bash
k6 run --out json=results.json load-tests/baseline.js
```

### CSV output:
```bash
k6 run --out csv=results.csv load-tests/baseline.js
```

### Grafana Cloud k6 (if configured):
```bash
K6_CLOUD_TOKEN=your-token k6 cloud load-tests/baseline.js
```

## Configuration

All scripts use `__ENV.BASE_URL` for the target server. Default is `http://localhost:3000`.

Override with:
```bash
k6 run --env BASE_URL=https://your-server.com load-tests/baseline.js
```

## Notes

- **CSRF tokens**: All POST requests fetch a CSRF token first via `GET /api/csrf-token`. This is required by the double-submit cookie CSRF protection.
- **Rate limiting**: The spike test expects 429 responses under heavy load. These are counted separately and are NOT treated as failures.
- **Auth flow**: Creates unique test users per VU+iteration to avoid conflicts. These test users should be cleaned up from the database after testing.
- **AI endpoints**: `POST /api/idea-bank/suggest` and `POST /api/copywriting/standalone` call Gemini AI. They are expected to be slower than read endpoints. A 400 response (e.g., product not found) is acceptable during load testing.
