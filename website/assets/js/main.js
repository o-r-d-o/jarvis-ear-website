// ─── Navbar scroll effect ───
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ─── Scroll reveal ───
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// ─── Waitlist form ───
function handleWaitlist(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const btn = e.target.querySelector('button');

  btn.textContent = 'JOINING...';
  btn.disabled = true;

  // Simulate submission (replace with real endpoint)
  setTimeout(() => {
    btn.textContent = "YOU'RE IN";
    btn.style.background = 'var(--green)';
    input.value = '';
    input.placeholder = 'Welcome aboard.';
    input.disabled = true;
  }, 800);
}

// ─── Smooth anchor scrolling ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      document.querySelector('nav').classList.remove('mobile-open');
    }
  });
});

// ─── Typing effect for demo ───
const demoLines = document.querySelectorAll('.demo-line');
demoLines.forEach((line, i) => {
  line.style.opacity = '0';
  line.style.transform = 'translateY(8px)';
  line.style.transition = `opacity 0.4s ease ${i * 0.15}s, transform 0.4s ease ${i * 0.15}s`;
});

const demoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      demoLines.forEach(line => {
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
      });
      demoObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const demoEl = document.querySelector('.command-demo');
if (demoEl) demoObserver.observe(demoEl);
