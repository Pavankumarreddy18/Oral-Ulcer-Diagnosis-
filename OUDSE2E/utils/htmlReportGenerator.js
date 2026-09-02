const fs = require('fs');
const path = require('path');

function generateHtmlReport(testResults, stats) {
  const htmlPath = path.join(__dirname, '../Test_Results/HTML/execution-report.html');
  
  const total = stats.passes + stats.failures;
  const passRate = total === 0 ? 0 : ((stats.passes / total) * 100).toFixed(1);
  
  const tableRows = testResults.map(test => `
    <tr class="${test.status === 'Passed' ? 'pass-row' : 'fail-row'}">
      <td>${test.category}</td>
      <td>${test.title}</td>
      <td><span class="badge ${test.status === 'Passed' ? 'badge-success' : 'badge-danger'}">${test.status}</span></td>
      <td>${test.duration}ms</td>
      <td>${test.error ? test.error.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '-'}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OUDS Web E2E Execution Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { background-color: #1e1e2e; color: #cdd6f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
    h1 { text-align: center; color: #89b4fa; border-bottom: 2px solid #313244; padding-bottom: 10px; }
    .summary-cards { display: flex; justify-content: center; gap: 20px; margin: 20px 0; }
    .card { background: #313244; padding: 20px; border-radius: 8px; text-align: center; width: 150px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    .card h2 { margin: 0 0 10px 0; font-size: 1.2rem; color: #a6adc8; }
    .card p { margin: 0; font-size: 2rem; font-weight: bold; }
    .text-success { color: #a6e3a1; }
    .text-danger { color: #f38ba8; }
    .text-info { color: #89b4fa; }
    .chart-container { width: 300px; height: 300px; margin: 0 auto 30px auto; }
    table { width: 100%; border-collapse: collapse; background: #313244; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #45475a; }
    th { background: #45475a; color: #cdd6f4; font-weight: 600; }
    tr:hover { background: #45475a; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
    .badge-success { background: rgba(166, 227, 161, 0.2); color: #a6e3a1; }
    .badge-danger { background: rgba(243, 139, 168, 0.2); color: #f38ba8; }
    .fail-row { background: rgba(243, 139, 168, 0.05); }
  </style>
</head>
<body>
  <h1>🚀 OUDS Mega Web E2E Test Report</h1>
  
  <div class="summary-cards">
    <div class="card">
      <h2>Total Tests</h2>
      <p class="text-info">${total}</p>
    </div>
    <div class="card">
      <h2>Passed</h2>
      <p class="text-success">${stats.passes}</p>
    </div>
    <div class="card">
      <h2>Failed</h2>
      <p class="text-danger">${stats.failures}</p>
    </div>
    <div class="card">
      <h2>Pass Rate</h2>
      <p class="text-success">${passRate}%</p>
    </div>
  </div>

  <div class="chart-container">
    <canvas id="resultsChart"></canvas>
  </div>

  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Test Name</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Error Details</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <script>
    const ctx = document.getElementById('resultsChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed'],
        datasets: [{
          data: [${stats.passes}, ${stats.failures}],
          backgroundColor: ['#a6e3a1', '#f38ba8'],
          borderColor: '#1e1e2e',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#cdd6f4' } }
        }
      }
    });
  </script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`HTML report generated: ${htmlPath}`);
}

module.exports = generateHtmlReport;
