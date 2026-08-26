export const renderCover = async (container) => {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center;" class="fade-in">
      <div style="font-size: 64px; color: var(--accent-blue); margin-bottom: 20px;">
        <i class="fa-solid fa-chart-pie"></i>
      </div>
      <h1 style="font-size: 42px; margin-bottom: 16px; font-weight: 800;">SEO & Website Traffic Dashboard</h1>
      <p style="color: var(--text-secondary); font-size: 18px; max-width: 600px; margin-bottom: 40px; line-height: 1.6;">
        Báo cáo hiệu suất tìm kiếm tự nhiên và lưu lượng truy cập website. Dữ liệu được cập nhật trực tiếp từ Google Analytics 4 và Google Search Console.
      </p>
      
      <div style="display: flex; gap: 20px;">
        <div style="background: var(--panel-bg); border: 1px solid var(--panel-border); padding: 20px; border-radius: var(--radius-md); width: 200px;">
          <div style="font-size: 24px; color: var(--accent-green); margin-bottom: 10px;"><i class="fa-solid fa-calendar-days"></i></div>
          <h3 style="font-size: 16px; margin-bottom: 5px;">Thời gian</h3>
          <p style="color: var(--text-tertiary); font-size: 13px;">30 Ngày Gần Nhất</p>
        </div>
        <div style="background: var(--panel-bg); border: 1px solid var(--panel-border); padding: 20px; border-radius: var(--radius-md); width: 200px;">
          <div style="font-size: 24px; color: var(--accent-blue); margin-bottom: 10px;"><i class="fa-solid fa-database"></i></div>
          <h3 style="font-size: 16px; margin-bottom: 5px;">Nguồn dữ liệu</h3>
          <p style="color: var(--text-tertiary); font-size: 13px;">Live Google API</p>
        </div>
      </div>
    </div>
  `;
};
