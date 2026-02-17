/* ============================================
   NAVIGATOR — Landing Page Scripts
   ============================================ */

// ---- Scroll Reveal ----
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  els.forEach((el) => observer.observe(el));
}

// ---- Nav Background on Scroll ----
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  function update() {
    if (window.scrollY > 80) {
      nav.classList.remove('nav--transparent');
      nav.classList.add('nav--solid');
    } else {
      nav.classList.remove('nav--solid');
      nav.classList.add('nav--transparent');
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ---- Mobile Menu ----
function initMobileMenu() {
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('active');
  });
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.remove('active');
}

// ---- Video Autoplay ----
function initVideo() {
  const video = document.getElementById('heroVideo');
  if (!video) return;

  // Force muted (required for autoplay on most browsers)
  video.muted = true;
  video.volume = 0;

  async function tryPlay() {
    try {
      await video.play();
    } catch (e) {
      // Silently fail — video stays paused, overlay covers it
    }
  }

  // Try immediately, on metadata, and on canplay
  tryPlay();
  video.addEventListener('loadeddata', tryPlay, { once: true });
  video.addEventListener('canplay', tryPlay, { once: true });

  // Final fallback: retry after a short delay (helps on some mobile browsers)
  setTimeout(tryPlay, 500);
}

// ---- Smooth Anchor Scroll ----
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initNavScroll();
  initMobileMenu();
  initVideo();
  initSmoothScroll();
});
