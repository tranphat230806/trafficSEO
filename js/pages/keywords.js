import { api } from '../api.js';
import { emptyState } from '../components/ui.js';

const escapeHTML = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatPosition = (position) => position === null ? '-' : position;

const formatChange = (change) => {
  if (change === null) return '<span class="text-muted">-</span>';
  if (change > 0) return `<span class="text-green"><i class="fa-solid fa-arrow-up"></i> +${change}</span>`;
  if (change < 0) return `<span class="text-red"><i class="fa-solid fa-arrow-down"></i> ${change}</span>`;
  return '<span class="text-muted"><i class="fa-solid fa-minus"></i> 0</span>';
};

const formatURL = (url) => url
  ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(url)}</a>`
  : '-';

export const renderKeywords = async (container) => {
  container.innerHTML = `
    <div class="dashboard-header fade-in">
      <div>
        <h1>Thứ hạng Từ Khóa</h1>
        <p>Dữ liệu thứ hạng trực tiếp từ SpinEditor</p>
      </div>
      <button class="refresh-button" id="refresh-keywords" type="button">
        <i class="fa-solid fa-rotate"></i> Cập nhật
      </button>
    </div>
    <div class="panel fade-in">
      <div class="keyword-sync-status" id="keywords-sync-status">Đang tải dữ liệu thật...</div>
      <div class="data-table-wrapper" id="keywords-table-container"></div>
    </div>
  `;

  const tableContainer = document.getElementById('keywords-table-container');
  const status = document.getElementById('keywords-sync-status');
  const refreshButton = document.getElementById('refresh-keywords');

  const loadKeywords = async () => {
    refreshButton.disabled = true;
    try {
      const result = await api.getKeywords();
      const data = result?.keywords || [];
      status.textContent = `${data.length} từ khóa từ SpinEditor • Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}`;

      if (data.length > 0) {
        const rows = data.map((row) => `
        <tr>
          <td class="keyword-cell">${escapeHTML(row.keyword)}</td>
          <td class="position-cell">${formatPosition(row.position)}</td>
          <td class="position-cell">${formatPosition(row.position_best)}</td>
          <td class="position-cell">${formatPosition(row.position_old)}</td>
          <td class="change-cell">${formatChange(row.position_change)}</td>
          <td class="url-cell">${formatURL(row.url)}</td>
          <td>${row.date_update ? escapeHTML(new Date(row.date_update).toLocaleString('vi-VN')) : '-'}</td>
        </tr>
        `).join('');

        tableContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Từ khóa</th>
              <th>Hiện tại</th>
              <th>Tốt nhất</th>
              <th>Trước đó</th>
              <th>Thay đổi</th>
              <th>URL</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        `;
      } else {
        tableContainer.innerHTML = emptyState('SpinEditor không trả về keyword nào.');
      }
    } finally {
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener('click', loadKeywords);
  await loadKeywords();

  // Keep the open dashboard synchronized with SpinEditor without using cached data.
  const refreshTimer = window.setInterval(loadKeywords, 5 * 60 * 1000);
  window.addEventListener('hashchange', () => window.clearInterval(refreshTimer), { once: true });
};
