import { api } from '../api.js';
import { header, kpiCard, formatNumber, formatPercent, emptyState } from '../components/ui.js';

export const renderSEO = async (container) => {
  container.innerHTML = `
    ${header('Hiệu suất SEO', 'Dữ liệu từ Google Search Console và GA4')}
    <div id="seo-kpis" class="kpi-grid"></div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
      <!-- Biến động SEO -->
      <div class="panel fade-in" style="margin-bottom: 0;">
        <div class="panel-header">
          <h2 class="panel-title"><i class="fa-solid fa-chart-line"></i> Biến động Clicks & Impressions (30 Ngày)</h2>
        </div>
        <div class="chart-container">
          <canvas id="seo-chart"></canvas>
        </div>
      </div>

      <!-- Traffic theo thiết bị (GA4) -->
      <div class="panel fade-in" style="margin-bottom: 0;">
        <div class="panel-header">
          <h2 class="panel-title"><i class="fa-solid fa-mobile-screen-button"></i> Traffic Theo Thiết Bị</h2>
        </div>
        <div class="chart-container" style="height: 300px;">
          <canvas id="device-chart"></canvas>
        </div>
        <div id="device-legend" style="margin-top: 15px;"></div>
      </div>
    </div>
  `;

  const kpiContainer = document.getElementById('seo-kpis');
  const chartCanvas = document.getElementById('seo-chart');
  const deviceCanvas = document.getElementById('device-chart');
  const deviceLegend = document.getElementById('device-legend');

  try {
    const [overview, perf, deviceTraffic] = await Promise.all([
      api.getLiveTrafficReport(), // We can use the old endpoint for overview KPIs on this page, or switch. Let's use the old one. Wait, live-traffic-report returns simple data.
      api.getSEOPerformance(),
      api.getTrafficByDevice()
    ]);

    // Average CTR & Position over 30 days
    let avgCtr = 0;
    let avgPos = 0;
    if (perf && perf.length > 0) {
      avgCtr = perf.reduce((acc, curr) => acc + curr.ctr, 0) / perf.length;
      avgPos = perf.reduce((acc, curr) => acc + curr.position, 0) / perf.length;
    }

    // Render KPIs
    kpiContainer.innerHTML = `
      ${kpiCard('Clicks', formatNumber(overview.clicks), 'fa-hand-pointer', 'orange', 'GSC')}
      ${kpiCard('Impressions', formatNumber(overview.impressions), 'fa-eye', 'blue', 'GSC')}
      ${kpiCard('Avg. CTR', formatPercent(avgCtr), 'fa-percent', 'purple', 'GSC')}
      ${kpiCard('Avg. Position', avgPos > 0 ? avgPos.toFixed(1) : '-', 'fa-ranking-star', 'green', 'GSC')}
    `;

    // Render Line Chart
    if (perf && perf.length > 0 && typeof Chart !== 'undefined') {
      new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: perf.map(item => item.date.substring(5)),
          datasets: [
            {
              label: 'Clicks',
              data: perf.map(item => item.clicks),
              borderColor: '#f97316',
              backgroundColor: '#f97316',
              borderWidth: 2,
              yAxisID: 'y'
            },
            {
              label: 'Impressions',
              data: perf.map(item => item.impressions),
              borderColor: '#3f6df6',
              backgroundColor: '#3f6df6',
              borderWidth: 2,
              yAxisID: 'y1'
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
            y: { type: 'linear', display: true, position: 'left', ticks: { color: '#f97316' }, grid: { color: '#263244' } },
            y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#3f6df6' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    } else {
      chartCanvas.parentElement.innerHTML = emptyState('Không có dữ liệu biểu đồ.');
    }

    // Render Donut Chart
    if (deviceTraffic && deviceTraffic.length > 0 && typeof Chart !== 'undefined') {
      const totalSessions = deviceTraffic.reduce((acc, curr) => acc + curr.sessions, 0);
      
      const labels = [];
      const data = [];
      const bgColors = ['#3f6df6', '#37d58a', '#f97316', '#a855f7'];

      deviceTraffic.forEach(item => {
        const deviceName = item.device.charAt(0).toUpperCase() + item.device.slice(1);
        labels.push(deviceName);
        data.push(item.sessions);
      });

      new Chart(deviceCanvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: bgColors,
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.raw;
                  const pct = ((val / totalSessions) * 100).toFixed(1);
                  return ` ${val} sessions (${pct}%)`;
                }
              }
            }
          }
        }
      });

      // Custom Legend
      deviceLegend.innerHTML = deviceTraffic.map((item, index) => {
        const pct = ((item.sessions / totalSessions) * 100).toFixed(1);
        const deviceName = item.device.charAt(0).toUpperCase() + item.device.slice(1);
        return `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${bgColors[index % bgColors.length]}"></span>
              <span style="color: var(--text-secondary);">${deviceName}</span>
            </div>
            <span style="font-weight: 600;">${pct}%</span>
          </div>
        `;
      }).join('');

    } else {
      deviceCanvas.parentElement.innerHTML = emptyState('Không có dữ liệu thiết bị.');
    }

  } catch (error) {
    throw error;
  }
};
