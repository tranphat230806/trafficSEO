import { handleRouting } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
  // Setup routing
  window.addEventListener('hashchange', handleRouting);
  
  // Initial route
  handleRouting();

  // Mobile menu toggle
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking a link on mobile
    sidebar.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && e.target.closest('.nav-item')) {
        sidebar.classList.remove('open');
      }
    });
  }
});
