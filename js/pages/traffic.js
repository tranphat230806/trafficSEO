import { api } from '../api.js';
import { header, trendKpiCard, formatNumber, formatPercent, formatDuration, formatPointChange, getTrendHTML, getEvaluation, emptyState } from '../components/ui.js';

export const renderTraffic = async (container) => {
  container.innerHTML = `
    ${header('Tổng quan Traffic & Acquisition', 'Lưu lượng truy cập từ Google Analytics 4 và GSC')}
    <div id="traffic-kpis" class="kpi-grid"></div>
    <div class="panel fade-in">
      <div class="panel-header">
        <h2 class="panel-title"><i class="fa-solid fa-table"></i> So sánh các chỉ số Traffic chính</h2>
      </div>
      <div class="data-table-wrapper" id="traffic-table-container"></div>
    </div>
    <div class="panel fade-in">
      <div class="panel-header">
        <h2 class="panel-title"><i class="fa-solid fa-chart-area"></i> Xu hướng Traffic (30 Ngày)</h2>
      </div>
      <div class="chart-container">
        <canvas id="traffic-chart"></canvas>
      </div>
    </div>
  `;

  const kpiContainer = document.getElementById('traffic-kpis');
  const tableContainer = document.getElementById('traffic-table-container');
  const chartCanvas = document.getElementById('traffic-chart');

  try {
    const [overview, trend] = await Promise.all([
      api.getOverview(),
      api.getTrafficTrend()
    ]);

    // Helpers to calculate change and percent change
    const calcChange = (cur, prev) => cur - prev;
    const calcPct = (cur, prev) => prev > 0 ? (cur - prev) / prev : 0;

    // Render KPIs
    kpiContainer.innerHTML = `
      ${trendKpiCard('Tổng Sessions', formatNumber(overview.sessions.current), calcPct(overview.sessions.current, overview.sessions.previous), null, 'fa-users', 'blue', 'GA4')}
      ${trendKpiCard('SEO Sessions', formatNumber(overview.seoSessions.current), calcPct(overview.seoSessions.current, overview.seoSessions.previous), null, 'fa-leaf', 'green', 'GA4')}
      ${trendKpiCard('SEO Contribution', formatPercent(overview.seoContribution.current / 100), null, (overview.seoContribution.current - overview.seoContribution.previous) / 100, 'fa-percent', 'purple', 'GA4')}
      ${trendKpiCard('Avg Session Duration', formatDuration(overview.averageSessionDuration.current), calcPct(overview.averageSessionDuration.current, overview.averageSessionDuration.previous), null, 'fa-clock', 'orange', 'GA4')}
      ${trendKpiCard('KPI Achievement', formatPercent(overview.kpiAchievement.achievement / 100), null, null, 'fa-bullseye', 'blue', 'Target: ' + formatNumber(overview.kpiAchievement.target))}
    `;

    // Render Table
    const buildRow = (label, cur, prev, isPoint = false, isDuration = false) => {
      const change = calcChange(cur, prev);
      const pct = calcPct(cur, prev);
      
      let curStr = formatNumber(cur);
      let prevStr = formatNumber(prev);
      let changeStr = formatNumber(change);
      if (change > 0) changeStr = '+' + changeStr;

      let pctDisplay = getTrendHTML(pct);
      if (isPoint) {
        curStr = formatPercent(cur / 100);
        prevStr = formatPercent(prev / 100);
        changeStr = formatPointChange(change / 100);
        pctDisplay = getTrendHTML(null, change / 100);
      }
      if (isDuration) {
        curStr = formatDuration(cur);
        prevStr = formatDuration(prev);
        changeStr = formatDuration(Math.abs(change));
        if (change > 0) changeStr = '+' + changeStr;
        else if (change < 0) changeStr = '-' + changeStr;
      }

      return `
        <tr>
          <td style="font-weight: 600;">${label}</td>
          <td>${curStr}</td>
          <td style="color: var(--text-secondary);">${prevStr}</td>
          <td>${changeStr}</td>
          <td>${pctDisplay}</td>
          <td>${getEvaluation(isPoint ? change / 100 : pct)}</td>
        </tr>
      `;
    };

    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Chỉ số đo lường</th>
            <th>Kỳ này</th>
            <th>Kỳ trước</th>
            <th>Thay đổi</th>
            <th>% Thay đổi</th>
            <th>Đánh giá</th>
          </tr>
        </thead>
        <tbody>
          ${buildRow('Users', overview.users.current, overview.users.previous)}
          ${buildRow('Sessions', overview.sessions.current, overview.sessions.previous)}
          ${buildRow('SEO Sessions', overview.seoSessions.current, overview.seoSessions.previous)}
          ${buildRow('SEO Contribution', overview.seoContribution.current, overview.seoContribution.previous, true)}
          ${buildRow('Pageviews', overview.pageviews.current, overview.pageviews.previous)}
          ${buildRow('GSC Clicks', overview.gscClicks.current, overview.gscClicks.previous)}
          ${buildRow('GSC Impressions', overview.gscImpressions.current, overview.gscImpressions.previous)}
          ${buildRow('Avg Session Duration', overview.averageSessionDuration.current, overview.averageSessionDuration.previous, false, true)}
        </tbody>
      </table>
    `;

    // Render Chart
    if (trend && trend.length > 0 && typeof Chart !== 'undefined') {
      new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: trend.map(item => item.date.substring(4)),
          datasets: [
            {
              label: 'Users',
              data: trend.map(item => item.users),
              borderColor: '#3f6df6',
              backgroundColor: 'rgba(63, 109, 246, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true
            },
            {
              label: 'Sessions',
              data: trend.map(item => item.sessions),
              borderColor: '#37d58a',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#8795aa' } } },
          scales: {
            x: { ticks: { color: '#8795aa' }, grid: { color: '#263244' } },
            y: { ticks: { color: '#8795aa' }, grid: { color: '#263244' }, beginAtZero: true }
          }
        }
      });
    } else {
      chartCanvas.parentElement.innerHTML = emptyState('Không có dữ liệu xu hướng.');
    }

  } catch (error) {
    throw error;
  }
};
