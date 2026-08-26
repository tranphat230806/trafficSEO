import { api } from '../api.js';
import { header, formatNumber, formatPercent, emptyState } from '../components/ui.js';

export const renderLandingPages = async (container) => {
  container.innerHTML = `
    ${header('Trang Đích (Landing Pages)', 'Top 50 trang phổ biến nhất từ GSC (30 Ngày)')}
    <div class="panel fade-in">
      <div class="data-table-wrapper" id="pages-table-container"></div>
    </div>
  `;

  const tableContainer = document.getElementById('pages-table-container');

  try {
    const data = await api.getLandingPages();

    if (data && data.length > 0) {
      let rows = data.map((row, index) => {
        // Rút gọn URL nếu quá dài
        let displayUrl = row.page;
        try {
          const url = new URL(row.page);
          displayUrl = url.pathname + url.search;
        } catch (e) {}
        
        return `
          <tr>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <a href="${row.page}" target="_blank" style="color: var(--accent-blue); text-decoration: none;">${displayUrl}</a>
            </td>
            <td>${formatNumber(row.clicks)}</td>
            <td>${formatNumber(row.impressions)}</td>
            <td>${formatPercent(row.ctr)}</td>
            <td class="text-green font-bold">${row.position.toFixed(1)}</td>
          </tr>
        `;
      }).join('');

      tableContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Page URL</th>
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
      tableContainer.innerHTML = emptyState('Không có dữ liệu trang đích.');
    }
  } catch (error) {
    throw error;
  }
};
