// ── Loader ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  const main   = document.getElementById('main');

  // Hide main until loader finishes
  main.style.opacity = '0';
  main.style.transform = 'translateY(20px)';

  setTimeout(() => {
    loader.style.transition = 'opacity .6s ease, transform .6s ease';
    loader.style.opacity    = '0';
    loader.style.transform  = 'translateY(-40px)';
    setTimeout(() => {
      loader.style.display = 'none';
      main.style.transition = 'opacity .7s ease, transform .7s ease';
      main.style.opacity    = '1';
      main.style.transform  = 'translateY(0)';
    }, 600);
  }, 3000);

  // ── Navbar scroll ──
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // ── Smooth nav links ──
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // ── Intersection Observer (reveal + stagger) ──
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = el.dataset.delay || 0;
      setTimeout(() => el.classList.add('visible'), +delay);
      io.unobserve(el);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal, .feat-card, .role-card, .step').forEach((el, i) => {
    if (el.classList.contains('feat-card') || el.classList.contains('role-card') || el.classList.contains('step')) {
      el.dataset.delay = i * 90;
    }
    io.observe(el);
  });

  // ── Stats counter ──
  const counters = document.querySelectorAll('.stat-num');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el   = entry.target;
      const end  = +el.dataset.target;
      const dur  = 1400;
      const step = end / (dur / 16);
      let cur = 0;
      const timer = setInterval(() => {
        cur += step;
        if (cur >= end) { cur = end; clearInterval(timer); }
        el.textContent = Math.round(cur) + (el.dataset.suffix || '');
      }, 16);
      countIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => countIO.observe(c));

  // ── Mockup parallax tilt ──
  const card = document.querySelector('.mockup-card');
  if (card) {
    card.addEventListener('mousemove', e => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = ((e.clientX - left) / width  - .5) * 16;
      const y = ((e.clientY - top)  / height - .5) * -12;
      card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
      card.style.animation = 'none';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateY(-6deg) rotateX(3deg)';
      card.style.animation = 'float 4s ease-in-out infinite';
    });
  }
});
