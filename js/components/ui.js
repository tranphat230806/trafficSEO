/**
 * UI Components
 */

export const header = (title, subtitle) => `
  <div class="dashboard-header fade-in">
    <div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
  </div>
`;

export const kpiCard = (title, value, icon, iconColor, source) => `
  <div class="kpi-card fade-in">
    <div class="kpi-title">
      ${title}
      <div class="kpi-icon ${iconColor}">
        <i class="${icon}"></i>
      </div>
    </div>
    <div class="kpi-value">${value}</div>
    <div style="margin-top: auto; padding-top: 15px; font-size: 12px; color: var(--text-tertiary);">
      Nguồn: ${source}
    </div>
  </div>
`;

export const emptyState = (message) => `
  <div class="state-message fade-in">
    <i class="fa-solid fa-box-open"></i>
    <p>${message}</p>
  </div>
`;

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('vi-VN').format(num);
};

export const formatPercent = (num) => {
  if (num === null || num === undefined) return '-';
  return (num * 100).toFixed(2) + '%';
};

export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '-';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

export const formatPointChange = (num) => {
  if (num === null || num === undefined) return '-';
  const sign = num > 0 ? '+' : '';
  return `${sign}${(num * 100).toFixed(2)} điểm %`;
};

export const getTrendHTML = (changePercent, pointChange = null) => {
  if (changePercent === null || changePercent === undefined) return '';
  const isPositive = changePercent > 0;
  const isNeutral = changePercent === 0;
  
  let colorClass = isPositive ? 'text-green' : 'text-red';
  if (isNeutral) colorClass = '';
  
  let icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
  if (isNeutral) icon = 'fa-minus';
  
  const displayValue = pointChange !== null ? formatPointChange(pointChange) : `${isPositive ? '+' : ''}${(changePercent * 100).toFixed(2)}%`;
  
  return `<span class="${colorClass}" style="font-weight: 600; font-size: 13px;">
    <i class="fa-solid ${icon}"></i> ${displayValue}
  </span>`;
};

export const trendKpiCard = (title, value, changePercent, pointChange, icon, iconColor, source) => `
  <div class="kpi-card fade-in">
    <div class="kpi-title">
      ${title}
      <div class="kpi-icon ${iconColor}">
        <i class="${icon}"></i>
      </div>
    </div>
    <div class="kpi-value" style="margin-bottom: 8px;">${value}</div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px;">
      ${getTrendHTML(changePercent, pointChange)}
      <div style="font-size: 11px; color: var(--text-tertiary);">Nguồn: ${source}</div>
    </div>
  </div>
`;

export const getEvaluation = (changePercent) => {
  if (changePercent >= 0.05) return `<span class="text-green font-bold">Tăng trưởng tốt</span>`;
  if (changePercent > -0.05 && changePercent < 0.05) return `<span style="color: var(--text-secondary);">Ổn định</span>`;
  if (changePercent <= -0.15) return `<span class="text-red font-bold">Cần theo dõi</span>`;
  return `<span class="text-red">Giảm nhẹ</span>`;
};
