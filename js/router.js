import { renderCover } from './pages/cover.js';
import { renderTraffic } from './pages/traffic.js';
import { renderSEO } from './pages/seo.js';
import { renderKeywords } from './pages/keywords.js';
import { renderLandingPages } from './pages/landing-pages.js';

// Route definitions
const routes = {
  '': renderCover,
  'cover': renderCover,
  'traffic': renderTraffic,
  'seo': renderSEO,
  'keywords': renderKeywords,
  'landing-pages': renderLandingPages,
};

export async function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'cover';
  const contentDiv = document.getElementById('app-content');
  
  if (!contentDiv) return;

  // Clear current content
  contentDiv.innerHTML = '';
  
  // Highlight active sidebar item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('href') === `#${hash}`) {
      el.classList.add('active');
    }
  });

  // Render new content
  const renderFn = routes[hash] || renderCover;
  
  try {
    await renderFn(contentDiv);
  } catch (err) {
    contentDiv.innerHTML = `
      <div class="state-message error-message fade-in">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Lỗi tải dữ liệu</h3>
        <p>${err.message}</p>
        <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 16px; background: var(--accent-red); border: none; border-radius: var(--radius-sm); color: white; cursor: pointer;">Thử lại</button>
      </div>
    `;
  }
}
