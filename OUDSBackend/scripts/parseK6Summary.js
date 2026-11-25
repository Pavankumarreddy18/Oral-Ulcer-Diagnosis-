/**
 * OUDS k6 Load Test Summary Parser
 * Reads summary.json produced by `k6 run --summary-export=summary.json`
 * and writes a human-readable markdown to stdout / GITHUB_STEP_SUMMARY.
 */

const fs = require('fs');
const path = require('path');

const summaryPath = path.resolve('summary.json');

if (!fs.existsSync(summaryPath)) {
  console.warn('summary.json not found – skipping metric parse (server may be offline in CI).');
  process.exit(0);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse summary.json:', e.message);
  process.exit(0);
}

const m = data.metrics || {};
const get = (key, stat) => m[key]?.values?.[stat] ?? 'N/A';

const md = `## 📊 k6 Load Test Results

| Metric | Value |
|---|---|
| **HTTP Requests** | ${get('http_reqs', 'count')} |
| **Request Rate** | ${get('http_reqs', 'rate')} req/s |
| **Avg Response Time** | ${get('http_req_duration', 'avg')} ms |
| **P95 Response Time** | ${get('http_req_duration', 'p(95)')} ms |
| **P99 Response Time** | ${get('http_req_duration', 'p(99)')} ms |
| **Failed Requests** | ${get('http_req_failed', 'rate')} |
| **Data Received** | ${get('data_received', 'count')} bytes |
| **Virtual Users** | ${get('vus', 'max')} |
`;

console.log(md);

// Write to GITHUB_STEP_SUMMARY if available
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  fs.appendFileSync(summaryFile, md);
  console.log('Written to GITHUB_STEP_SUMMARY');
}
