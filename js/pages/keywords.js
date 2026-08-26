import { api } from '../api.js';
import { header, formatNumber, formatPercent, emptyState } from '../components/ui.js';

export const renderKeywords = async (container) => {
  container.innerHTML = `
    ${header('Thứ hạng Từ Khóa', 'Top 50 truy vấn tìm kiếm từ GSC (30 Ngày)')}
    <div class="panel fade-in">
      <div class="data-table-wrapper" id="keywords-table-container"></div>
    </div>
  `;

  const tableContainer = document.getElementById('keywords-table-container');

  try {
    const data = await api.getKeywords();

    if (data && data.length > 0) {
      let rows = data.map((row, index) => `
        <tr>
          <td style="color: var(--accent-blue); font-weight: 500;">${row.query}</td>
          <td>${formatNumber(row.clicks)}</td>
          <td>${formatNumber(row.impressions)}</td>
          <td>${formatPercent(row.ctr)}</td>
          <td class="text-green font-bold">${row.position.toFixed(1)}</td>
        </tr>
      `).join('');

      tableContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Từ Khóa</th>
              <th>Clicks</th>
              <th>Impressions</th>
              <th>CTR</th>
              <th>Vị Trí TB</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    } else {
      tableContainer.innerHTML = emptyState('Không có dữ liệu từ khóa.');
    }
  } catch (error) {
    throw error;
  }
};
