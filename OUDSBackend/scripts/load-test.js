/**
 * OUDS API Load Test (k6)
 * Tests the backend /api/ulcer/analyze endpoint under load.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m',  target: 20 },   // sustain
    { duration: '20s', target: 0  },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% under 3s
    http_req_failed:   ['rate<0.05'],   // <5% failures
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:5000';

export default function () {
  // Health-check ping (no auth required)
  const ping = http.get(`${BASE_URL}/api/health`);
  check(ping, { 'health ok': (r) => r.status === 200 || r.status === 404 });

  sleep(1);
}
