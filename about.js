(() => {
  'use strict';

  // Normalize URL bar to /about if loaded via /about/ or /about.html
  if (window.location.pathname === '/about/' || window.location.pathname === '/about.html') {
    window.history.replaceState(null, '', '/about' + window.location.search + window.location.hash);
  }

  // ==========================================================================
  // Floating Liquid Glass Navigation Bar (About Us Page)
  // ==========================================================================
  const floatingNavbar = document.getElementById('floating-navbar');
  const navMobileToggle = document.getElementById('nav-mobile-toggle');
  const navMobileMenu = document.getElementById('nav-mobile-menu');

  if (floatingNavbar) {
    // 1. Mobile Menu Toggle
    if (navMobileToggle) {
      navMobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = floatingNavbar.classList.toggle('nav-open');
        navMobileToggle.setAttribute('aria-expanded', String(isOpen));
        if (navMobileMenu) {
          navMobileMenu.setAttribute('aria-hidden', String(!isOpen));
        }
      });
    }

    // 2. Click Outside to Close Mobile Menu
    document.addEventListener('click', (e) => {
      if (floatingNavbar.classList.contains('nav-open') && !floatingNavbar.contains(e.target)) {
        floatingNavbar.classList.remove('nav-open');
        if (navMobileToggle) navMobileToggle.setAttribute('aria-expanded', 'false');
        if (navMobileMenu) navMobileMenu.setAttribute('aria-hidden', 'true');
      }
    });

    // 3. Escape Key to Close Mobile Menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && floatingNavbar.classList.contains('nav-open')) {
        floatingNavbar.classList.remove('nav-open');
        if (navMobileToggle) {
          navMobileToggle.setAttribute('aria-expanded', 'false');
          navMobileToggle.focus();
        }
        if (navMobileMenu) navMobileMenu.setAttribute('aria-hidden', 'true');
      }
    });

    // 4. Smooth Anchor Scrolling for on-page links (#team-assistance, etc.)
    const onPageAnchorLinks = document.querySelectorAll('a[href^="#"]');
    onPageAnchorLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        // Close mobile drawer if open
        if (floatingNavbar.classList.contains('nav-open')) {
          floatingNavbar.classList.remove('nav-open');
          if (navMobileToggle) navMobileToggle.setAttribute('aria-expanded', 'false');
          if (navMobileMenu) navMobileMenu.setAttribute('aria-hidden', 'true');
        }

        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          const navOffset = 90;
          const targetY = targetEl.getBoundingClientRect().top + window.pageYOffset - navOffset;
          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          });
        }
      });
    });

    // 5. Navbar Scroll Depth Effect
    const updateNavbarScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      if (scrollY > 35) {
        floatingNavbar.classList.add('nav-scrolled');
      } else {
        floatingNavbar.classList.remove('nav-scrolled');
      }
    };

    window.addEventListener('scroll', updateNavbarScroll, { passive: true });
    updateNavbarScroll();
  }

  // ==========================================================================
  // Scroll-Triggered Entrance Animations (IntersectionObserver)
  // Staggered reveals for headings, timeline items, services cards, team cards
  // ==========================================================================
  const animatedElements = document.querySelectorAll('.animate-on-scroll');

  if ('IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.12
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.getAttribute('data-delay');
          if (delay) {
            setTimeout(() => {
              el.classList.add('is-visible');
            }, parseInt(delay, 10));
          } else {
            el.classList.add('is-visible');
          }
          obs.unobserve(el);
        }
      });
    }, observerOptions);

    animatedElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback if IntersectionObserver is not supported
    animatedElements.forEach((el) => el.classList.add('is-visible'));
  }

  // Reveal hero banner text immediately upon DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    const heroInner = document.querySelector('.hero-text-inner');
    if (heroInner) {
      setTimeout(() => {
        heroInner.classList.add('is-visible');
      }, 150);
    }
  });

})();
