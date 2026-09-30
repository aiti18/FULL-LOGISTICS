'use strict';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const rafThrottle = callback => {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      callback();
    });
  };
};

function initHeader() {
  const header = $('#header');
  if (!header) return;
  const links = $$('.nav__link');
  const sections = links.map(link => $(link.getAttribute('href'))).filter(Boolean);

  const update = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
    const position = window.scrollY + 180;
    let current = sections[0]?.id;
    sections.forEach(section => {
      if (section.offsetTop <= position) current = section.id;
    });
    links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${current}`));
  };

  update();
  window.addEventListener('scroll', rafThrottle(update), { passive: true });
}

function initMobileMenu() {
  const burger = $('.burger');
  const nav = $('#primary-nav');
  if (!burger || !nav) return;

  const setOpen = open => {
    burger.classList.toggle('active', open);
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('no-scroll', open);
  };

  burger.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  $$('a, button', nav).forEach(item => item.addEventListener('click', () => setOpen(false)));
  window.addEventListener('resize', () => { if (window.innerWidth > 1024) setOpen(false); });
}

function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = $(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', link.getAttribute('href'));
    });
  });
}

function initRevealAnimations() {
  const elements = $$('.reveal');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = Number(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  elements.forEach(el => observer.observe(el));
}

function initFAQ() {
  const items = $$('.faq-item');
  const openItem = item => {
    const answer = $('.faq-answer', item);
    item.classList.add('active');
    $('button', item).setAttribute('aria-expanded', 'true');
    answer.style.height = `${answer.scrollHeight}px`;
  };
  const closeItem = item => {
    item.classList.remove('active');
    $('button', item).setAttribute('aria-expanded', 'false');
    $('.faq-answer', item).style.height = '0px';
  };

  items.forEach(item => {
    if (item.classList.contains('active')) openItem(item);
    $('button', item).addEventListener('click', () => {
      const wasOpen = item.classList.contains('active');
      items.forEach(closeItem);
      if (!wasOpen) openItem(item);
    });
  });
  window.addEventListener('resize', () => {
    const active = $('.faq-item.active');
    if (active) $('.faq-answer', active).style.height = `${$('.faq-answer', active).scrollHeight}px`;
  });
}

function initFbsFboTabs() {
  const tabs = $$('.tab');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(button => {
      const active = button === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $$('.tab-panel').forEach(panel => {
      const active = panel.id === `panel-${tab.dataset.tab}`;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }));
}

function initCalculator() {
  const quantity = $('#quantity');
  const total = $('#calc-total');
  const checks = $$('[data-price]');
  if (!quantity || !total) return;
  const form = quantity.closest('form');

  const calculate = () => {
    const minimum = Number(quantity.min) || 0;
    const maximum = Number(quantity.max) || Number.MAX_SAFE_INTEGER;
    const qty = quantity.value === '' ? 0 : Math.min(maximum, Math.max(minimum, Number(quantity.value) || 0));
    const unitPrice = checks.filter(item => item.checked).reduce((sum, item) => sum + Number(item.dataset.price), 0);
    total.value = (qty * unitPrice).toLocaleString('ru-RU');
    total.textContent = total.value;
  };
  quantity.addEventListener('input', calculate);
  checks.forEach(item => item.addEventListener('change', calculate));
  form?.addEventListener('submit', event => event.preventDefault());
  calculate();
}

function initModal() {
  const modal = $('#lead-modal');
  if (!modal) return;
  const dialog = $('.modal__dialog', modal);
  let previousFocus = null;

  const open = () => {
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(() => $('input', modal)?.focus(), 30);
  };
  const close = () => {
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    previousFocus?.focus();
  };

  $$('[data-modal-open]').forEach(button => button.addEventListener('click', open));
  $$('[data-modal-close]', modal).forEach(button => button.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) close();
    if (event.key === 'Tab' && !modal.hidden) {
      const focusables = $$('button, input, textarea, a[href]', dialog).filter(el => !el.disabled);
      const first = focusables[0];
      const last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

const WHATSAPP_NUMBER = '996226199898';
const LEAD_FIELD_LIMITS = Object.freeze({
  name: 80,
  phone: 30,
  company: 120,
  quantity: 7,
  comment: 1000
});

function normalizeLeadData(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    const text = String(value ?? '').trim();
    return [key, text.slice(0, LEAD_FIELD_LIMITS[key] || 1000)];
  }));
}

function createWhatsAppLeadUrl(data) {
  const lines = [
    'Здравствуйте! Хочу получить расчет стоимости фулфилмента.',
    '',
    `Имя: ${data.name}`,
    `Телефон: ${data.phone}`
  ];

  if (data.company) lines.push(`Компания: ${data.company}`);
  if (data.quantity) lines.push(`Количество товаров: ${data.quantity}`);
  if (data.comment) lines.push(`Комментарий: ${data.comment}`);

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function initForms() {
  $$('[data-lead-form]').forEach(form => {
    Object.entries(LEAD_FIELD_LIMITS).forEach(([name, limit]) => {
      const field = $(`[name="${name}"]`, form);
      if (!field) return;
      if (field.type === 'number') field.max = '1000000';
      else field.maxLength = limit;
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      let valid = true;
      $$('.error', form).forEach(error => { error.textContent = ''; });
      $$('.invalid', form).forEach(field => field.classList.remove('invalid'));

      $$('[required]', form).forEach(input => {
        if (input.type === 'checkbox' && !input.checked) {
          valid = false;
          const consentError = $('.consent-error', form);
          if (consentError) consentError.textContent = 'Необходимо ваше согласие';
          return;
        }
        if (input.type !== 'checkbox' && !input.value.trim()) {
          valid = false;
          input.closest('.field')?.classList.add('invalid');
          const error = $('.error', input.closest('.field'));
          if (error) error.textContent = 'Заполните это поле';
        }
      });

      const phone = $('[name="phone"]', form);
      const phoneValue = phone?.value.trim() || '';
      const phoneDigits = phoneValue.replace(/\D/g, '');
      if (phoneValue && (!/^[+\d\s()-]+$/.test(phoneValue) || phoneDigits.length < 9 || phoneDigits.length > 15)) {
        valid = false;
        phone.closest('.field')?.classList.add('invalid');
        $('.error', phone.closest('.field')).textContent = 'Проверьте номер телефона';
      }

      const quantity = $('[name="quantity"]', form);
      if (quantity?.value && (Number(quantity.value) < 1 || Number(quantity.value) > 1000000)) {
        valid = false;
        quantity.closest('.field')?.classList.add('invalid');
        const error = $('.error', quantity.closest('.field'));
        if (error) error.textContent = 'Введите число от 1 до 1 000 000';
      }

      if (!valid) {
        $('.field.invalid input, .field.invalid textarea, .consent input:not(:checked)', form)?.focus();
        return;
      }

      const data = normalizeLeadData(Object.fromEntries(new FormData(form)));
      window.location.assign(createWhatsAppLeadUrl(data));
    });
  });
}

function initLightbox() {
  const lightbox = $('.lightbox');
  if (!lightbox) return;
  const image = $('img', lightbox);
  const closeButton = $('.lightbox__close', lightbox);
  let previousFocus = null;
  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove('no-scroll');
    previousFocus?.focus();
  };

  $$('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
    previousFocus = button;
    image.src = button.dataset.lightbox;
    image.alt = $('img', button)?.alt || 'Фотография склада';
    lightbox.hidden = false;
    document.body.classList.add('no-scroll');
    closeButton.focus();
  }));
  closeButton.addEventListener('click', close);
  lightbox.addEventListener('click', event => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !lightbox.hidden) close(); });
}

function initScrollTop() {
  const button = $('.scroll-top');
  if (!button) return;
  const update = () => button.classList.toggle('visible', window.scrollY > 500);
  window.addEventListener('scroll', rafThrottle(update), { passive: true });
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  update();
}

function initHeroParallax() {
  const image = $('.hero__visual > img');
  if (!image || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(max-width: 768px)').matches) return;
  const update = () => {
    if (window.scrollY < 900) image.style.transform = `translateY(${window.scrollY * 0.025}px) scale(1.02)`;
    else image.style.transform = '';
  };
  window.addEventListener('scroll', rafThrottle(update), { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initSmoothScroll();
  initRevealAnimations();
  initFAQ();
  initFbsFboTabs();
  initCalculator();
  initModal();
  initForms();
  initLightbox();
  initScrollTop();
  initHeroParallax();
});
