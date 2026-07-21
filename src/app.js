(() => {
  'use strict';
  
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const root = document.documentElement;
  
  let lang = localStorage.getItem('csLang') === 'en' ? 'en' : 'ru';
  let unlocked = false;
  let currentGuide = null;
  let guidesCache = {};
  
  const copy = {
    ru: {
      style: 'СТИЛЬ', hints: 'ПОДСКАЗКИ', online: 'СИСТЕМА В СЕТИ', guides: 'Гайды',
      subtitle: 'Закрытая база игровых протоколов. Доступ защищён персональным шифром.',
      cipher: 'СЕКРЕТНЫЙ ШИФР', open: 'Открыть гайд', format: 'Формат шифра',
      test: 'Тестовый доступ', how: 'Как открыть', protocol: 'активный протокол',
      chapters: 'практических разделов', styles: 'уникальных дизайна',
      locked: 'Гайд заблокирован', lockedText: 'Введите точный шифр, чтобы открыть материал.',
      howTitle: 'Как открыть гайд', step1: 'Получите шифр CYBERSHOP.',
      step2: 'Вставьте код без пробелов.', step3: 'Нажмите «Открыть гайд».',
      insert: 'Вставить тестовый шифр', light: 'Светлая', dark: 'Тёмная',
      access: 'Доступ разрешён', bad: 'Неверный шифр', retry: 'Попробовать снова',
      start: 'Начало', safety: 'Безопасность', intro: 'Введение', algorithm: 'Алгоритм',
      advanced: 'Техники', quick: 'Краткий гайд', bonus: 'БОНУС',
      quickTitle: 'Краткий гайд: всё необходимое', quickSub: 'Сжатая практическая версия'
    },
    en: {
      style: 'STYLE', hints: 'HINTS', online: 'SYSTEM ONLINE', guides: 'Guides',
      subtitle: 'A private archive of gaming protocols protected by a personal cipher.',
      cipher: 'SECRET CIPHER', open: 'Unlock guide', format: 'Cipher format',
      test: 'Test access', how: 'How to unlock', protocol: 'active protocol',
      chapters: 'practical chapters', styles: 'unique designs',
      locked: 'Guide locked', lockedText: 'Enter the exact cipher to open the material.',
      howTitle: 'How to unlock a guide', step1: 'Get a CYBERSHOP cipher.',
      step2: 'Paste the code without spaces.', step3: 'Press "Unlock guide".',
      insert: 'Insert test cipher', light: 'Light', dark: 'Dark',
      access: 'Access granted', bad: 'Invalid cipher', retry: 'Try again',
      start: 'Start', safety: 'Safety', intro: 'Introduction', algorithm: 'Algorithm',
      advanced: 'Advanced', quick: 'Quick Guide', bonus: 'BONUS',
      quickTitle: 'Quick guide: everything you need', quickSub: 'Compressed practical version'
    }
  };
  
  function t(key) { return copy[lang][key] || key; }
  
  async function loadGuidesFromAPI() {
    try {
      const res = await fetch('/api/guides/public');
      const guides = await res.json();
      guidesCache = {};
      guides.forEach(g => {
        guidesCache[g.guide_id] = g;
      });
      return guides;
    } catch (err) {
      console.error('Failed to load guides from API:', err);
      return [];
    }
  }
  
  async function verifyCipherViaAPI(guideId, cipher) {
    try {
      const res = await fetch('/api/guides/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_id: guideId, cipher })
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error('Cipher verification failed:', err);
      return null;
    }
  }
  
  function trackPageView(guideId) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'page_view', guide_id: guideId })
    }).catch(() => {});
  }
  
  function applyLanguage(next, notify = true) {
    lang = next;
    root.lang = next;
    localStorage.setItem('csLang', next);
    
    qa('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (copy[lang][key]) el.textContent = copy[lang][key];
    });
    
    q('#langLabel').textContent = lang === 'ru' ? 'RU' : 'EN';
    q('#cipherInput').placeholder = lang === 'ru' ? 'Вставьте шифр сюда...' : 'Paste cipher here...';
    
    if (unlocked && currentGuide) {
      renderGuide(currentGuide);
    }
    
    document.dispatchEvent(new CustomEvent('cs:language', { detail: { lang } }));
    
    if (notify) {
      toast(lang === 'ru' ? 'Язык: Русский' : 'Language: English');
    }
  }
  
  function syncTheme() {
    const isLight = root.dataset.theme === 'light';
    q('#themeIcon').textContent = isLight ? '☀' : '☾';
    q('#themeLabel').textContent = isLight ? t('light') : t('dark');
    document.querySelector('meta[name="theme-color"]').content = isLight ? '#eef4f8' : '#050713';
  }
  
  function toast(msg) {
    const e = q('#toast');
    if (!e) return;
    e.textContent = msg;
    e.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => e.classList.remove('show'), 2000);
  }
  
  function renderGuide(guide) {
    const sections = JSON.parse(guide.sections_json || '[]');
    const title = lang === 'en' ? (guide.title_en || guide.title_ru) : guide.title_ru;
    const desc = lang === 'en' ? (guide.description_en || guide.description_ru) : guide.description_ru;
    
    let sectionsHTML = sections.map((s, i) => `
      <section id="guide-section-${i}">
        <h3>${escapeHtml(s.heading || '')}</h3>
        <p>${escapeHtml(s.body || '')}</p>
      </section>
    `).join('');
    
    let navButtons = sections.map((s, i) => 
      `<button data-target="guide-section-${i}">${escapeHtml(s.heading || 'Section ' + (i+1))}</button>`
    ).join('');
    
    q('#contentPanel').innerHTML = `
      <article class="guide">
        <header class="guideTop">
          <div class="category">${escapeHtml(guide.category)}</div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(desc || '')}</p>
        </header>
        <nav class="guideNav">
          <button data-target="guide-section-0" class="quickButton">${t('start')}</button>
          ${navButtons}
          <button data-target="bonus-section" class="bonusNavButton">${t('bonus')}</button>
        </nav>
        ${sectionsHTML}
        <div id="bonus-section" class="megaAd"></div>
      </article>
    `;
    
    q('#contentPanel').addEventListener('click', e => {
      const b = e.target.closest('[data-target]');
      if (!b) return;
      const target = document.getElementById(b.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    document.dispatchEvent(new CustomEvent('cs:guide-rendered'));
    q('#contentPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  
  async function unlock() {
    const cipher = q('#cipherInput').value.trim();
    if (!cipher) return;
    
    const btn = q('#unlockBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    await new Promise(r => setTimeout(r, 280));
    
    const guideIds = Object.keys(guidesCache);
    let found = false;
    
    for (const guideId of guideIds) {
      const result = await verifyCipherViaAPI(guideId, cipher);
      if (result && result.guide) {
        unlocked = true;
        currentGuide = result.guide;
        renderGuide(currentGuide);
        toast(t('access'));
        trackPageView(currentGuide.id);
        found = true;
        break;
      }
    }
    
    if (!found) {
      q('#contentPanel').innerHTML = `
        <div class="locked" style="text-align:center;padding:40px">
          <h3>${t('bad')}</h3>
          <p>${t('retry')}</p>
          <button class="btn" onclick="document.querySelector('#cipherInput').focus()">${t('retry')}</button>
        </div>
      `;
      toast(t('bad'));
    }
    
    btn.classList.remove('loading');
    btn.disabled = false;
  }
  
  function init() {
    root.dataset.theme = localStorage.getItem('csTheme') || 'dark';
    root.dataset.style = localStorage.getItem('csStyle') || 'neon';
    
    applyLanguage(lang, false);
    syncTheme();
    
    q('#langBtn').onclick = () => applyLanguage(lang === 'ru' ? 'en' : 'ru');
    q('#themeBtn').onclick = () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('csTheme', root.dataset.theme);
      syncTheme();
    };
    q('#hintsBtn').onclick = () => q('#hintModal').hidden = false;
    qa('[data-close]').forEach(e => e.onclick = () => q('#hintModal').hidden = true);
    
    q('#fillTest').onclick = () => {
      q('#cipherInput').value = Object.values(guidesCache)[0]?.cipher_code || '';
      q('#hintModal').hidden = true;
      q('#cipherInput').focus();
    };
    
    qa('.hintChip').forEach(chip => {
      chip.addEventListener('click', () => {
        const hint = chip.dataset.hint;
        if (hint === 'format' || hint === 'help') q('#hintModal').hidden = false;
        if (hint === 'test') q('#fillTest').click();
      });
    });
    
    q('#unlockBtn').addEventListener('click', unlock);
    q('#cipherInput').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
    
    document.querySelectorAll('.styleMenu button[data-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.dataset.style = btn.dataset.style;
        localStorage.setItem('csStyle', btn.dataset.style);
      });
    });
    
    loadGuidesFromAPI().then(guides => {
      q('#guideCount').textContent = String(guides.length).padStart(2, '0');
    });
    
    trackPageView(null);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  window.CS_APP = {
    setLanguage: applyLanguage,
    getLanguage: () => lang,
    renderGuide: () => unlocked && currentGuide && renderGuide(currentGuide),
    getGuides: () => guidesCache
  };
})();
