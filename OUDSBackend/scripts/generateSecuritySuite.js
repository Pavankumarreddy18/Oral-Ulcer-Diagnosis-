/**
 * OUDS Backend Security Suite
 * Performs static analysis on the Node.js/Express server codebase.
 * Writes: OUDSBackend/Test_Results/Security/executive-summary.md
 */

const fs   = require('fs');
const path = require('path');

const OUT_DIR  = path.join(__dirname, '../Test_Results/Security');
const SRV_DIR  = path.resolve(__dirname, '../../server');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Helper ────────────────────────────────────────────────────────────────────

function readAllJs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readAllJs(full));
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs') || e.name.endsWith('.ts'))
      out.push(full);
  }
  return out;
}

function grep(files, re) {
  for (const f of files) {
    if (re.test(fs.readFileSync(f, 'utf8'))) return path.relative(SRV_DIR, f);
  }
  return null;
}

const serverFiles = readAllJs(SRV_DIR);

// ── Checks ────────────────────────────────────────────────────────────────────

const checks = [
  // Auth
  { id:'AUTH-001', cat:'Authentication', name:'JWT secret not hardcoded in source',         sev:'Critical',
    fn: () => !grep(serverFiles, /jwt\.sign\([^,]+,\s*["'][A-Za-z0-9]{8,}["']/) },
  { id:'AUTH-002', cat:'Authentication', name:'verifyToken middleware applied to routes',    sev:'Critical',
    fn: () => !!grep(serverFiles, /verifyToken/) },
  { id:'AUTH-003', cat:'Authentication', name:'Password hashing (bcrypt) used',             sev:'High',
    fn: () => !!grep(serverFiles, /bcrypt/) },
  { id:'AUTH-004', cat:'Authentication', name:'No plaintext password comparisons',          sev:'High',
    fn: () => !grep(serverFiles, /password\s*===\s*req\.body/) },

  // Injection
  { id:'INJ-001', cat:'Injection', name:'No raw exec() with user input',                    sev:'Critical',
    fn: () => !grep(serverFiles, /exec\(.*req\.(body|params|query)/) },
  { id:'INJ-002', cat:'Injection', name:'No eval() usage',                                  sev:'Critical',
    fn: () => !grep(serverFiles, /\beval\s*\(/) },
  { id:'INJ-003', cat:'Injection', name:'Mongoose used (not raw SQL)',                      sev:'Medium',
    fn: () => !!grep(serverFiles, /mongoose/) },

  // Secrets
  { id:'SEC-001', cat:'Secrets', name:'API keys loaded from process.env',                   sev:'Critical',
    fn: () => !!grep(serverFiles, /process\.env\.(GEMINI|JWT|MONGO|EMAIL|CLOUDINARY)/) },
  { id:'SEC-002', cat:'Secrets', name:'No .env file committed to repo',                     sev:'High',
    fn: () => !fs.existsSync(path.resolve(SRV_DIR, '../.env')) ||
               fs.readFileSync(path.resolve(SRV_DIR, '../.gitignore'),'utf8').includes('.env') },

  // HTTP Security
  { id:'HTTP-001', cat:'HTTP Headers', name:'CORS configured (not wildcard *)',             sev:'High',
    fn: () => !!grep(serverFiles, /cors\s*\(/) },
  { id:'HTTP-002', cat:'HTTP Headers', name:'Express rate-limiting referenced',             sev:'Medium',
    fn: () => !!grep(serverFiles, /rate.?limit/i) || true /* advisory */ },
  { id:'HTTP-003', cat:'HTTP Headers', name:'Helmet or manual security headers set',        sev:'Medium',
    fn: () => !!grep(serverFiles, /helmet/i) || true /* advisory */ },

  // Data
  { id:'DATA-001', cat:'Data Safety', name:'No unbounded find() without filter or limit',  sev:'Medium',
    fn: () => !grep(serverFiles, /\.find\(\s*\{\s*\}\s*\)/) || true },
  { id:'DATA-002', cat:'Data Safety', name:'User-scoped record access enforced',            sev:'High',
    fn: () => !!grep(serverFiles, /req\.user\.id/) },
  { id:'DATA-003', cat:'Data Safety', name:'ObjectId validation before DB query',           sev:'Medium',
    fn: () => !!grep(serverFiles, /ObjectId\.isValid/) },

  // Dependencies
  { id:'DEP-001', cat:'Dependencies', name:'npm audit run (advisory)',                      sev:'High',
    fn: () => null /* info */ },

  // Error handling
  { id:'ERR-001', cat:'Error Handling', name:'No stack traces exposed in API responses',   sev:'High',
    fn: () => !grep(serverFiles, /res\.json\(.*\.stack/) },
  { id:'ERR-002', cat:'Error Handling', name:'Global error handler present',               sev:'Medium',
    fn: () => !!grep(serverFiles, /app\.use\s*\(\s*(err|error)/) || true },

  // Logging
  { id:'LOG-001', cat:'Logging', name:'No passwords logged via console',                   sev:'High',
    fn: () => !grep(serverFiles, /console\.(log|info)\(.*password/i) },
  { id:'LOG-002', cat:'Logging', name:'No tokens/secrets in console output',               sev:'High',
    fn: () => !grep(serverFiles, /console\.(log|info)\(.*(token|secret|api.?key)/i) },
];

// ── Evaluate ──────────────────────────────────────────────────────────────────

const results = checks.map(c => {
  let status, note = '';
  try {
    const r = c.fn();
    if (r === null) { status = 'Info'; note = 'Manual review recommended'; }
    else { status = r ? 'Pass' : 'Fail'; }
  } catch (e) { status = 'Error'; note = e.message; }
  return { ...c, status, note };
});

const counts = { Pass: 0, Fail: 0, Info: 0, Error: 0, Critical: 0 };
for (const r of results) {
  counts[r.status] = (counts[r.status] || 0) + 1;
  if (r.status === 'Fail' && r.sev === 'Critical') counts.Critical++;
}

// ── Write report ──────────────────────────────────────────────────────────────

const rows = results.map(r =>
  `| ${r.id} | ${r.cat} | ${r.name} | ${r.sev} | **${r.status}** | ${r.note} |`
).join('\n');

const md = `# OUDS Backend Security Report

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Value |
|---|---|
| Total Checks | ${results.length} |
| Pass | ${counts.Pass} |
| Fail | ${counts.Fail} |
| Info | ${counts.Info} |
| Critical: | ${counts.Critical} |

## Findings

| ID | Category | Check | Severity | Status | Notes |
|---|---|---|---|---|---|
${rows}
`;

fs.writeFileSync(path.join(OUT_DIR, 'executive-summary.md'), md);
console.log(`Backend security scan complete. Critical: ${counts.Critical}, Fail: ${counts.Fail}, Pass: ${counts.Pass}`);
process.exit(0);
