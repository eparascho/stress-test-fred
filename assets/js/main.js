/*
 * Stress-test FRED · site behavior
 * Tabs (one page per URL hash), mobile menu, config-driven links, the slide
 * viewer and the red-teaming examples explorer. No dependencies.
 */
(function () {
  'use strict';

  var SITE_NAME = 'Stress-test FRED';
  var PAGE_TITLES = {
    home: 'Stress-test FRED · D3A Workshop 2026',
    agenda: 'Agenda',
    fred: 'Meet FRED',
    examples: 'Red-teaming examples',
    instructions: 'Instructions',
    findings: 'Findings'
  };
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var config = window.SITE_CONFIG || {};
  var header = document.querySelector('[data-header]');

  /* ---------- Helpers ---------- */

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function isPage(id) {
    return Object.prototype.hasOwnProperty.call(PAGE_TITLES, id);
  }

  function currentPage() {
    return root.getAttribute('data-page');
  }

  // Tiny element builder: h('p', { class: 'x', text: 'Hi' }, [child, 'text']).
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'html') el.innerHTML = value;
      else el.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  function icon(name) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Plain text to HTML: blank lines start paragraphs, ==text== is highlighted.
  function richText(text) {
    return String(text || '')
      .split(/\n{2,}/)
      .map(function (para) {
        return '<p>' + escapeHtml(para).replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/\n/g, '<br>') + '</p>';
      })
      .join('');
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function focusPageHeading(scroll) {
    var heading = document.getElementById(currentPage() + '-title');
    if (heading) heading.focus({ preventScroll: !scroll });
  }

  /* ---------- Tabs ---------- */

  var navToggle = $('[data-nav-toggle]');

  function setNav(open) {
    if (!navToggle) return;
    navToggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('nav-open', open);
  }

  function showPage(page) {
    root.setAttribute('data-page', page);
    document.title = page === 'home' ? PAGE_TITLES.home : PAGE_TITLES[page] + ' · ' + SITE_NAME;
    $$('[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // A hash is either a page (#agenda) or an element inside a page (#team).
  function route(fromUser) {
    var id = decodeURIComponent(location.hash.slice(1));
    var page = isPage(id) ? id : null;
    var target = null;
    if (!page && id) {
      var el = document.getElementById(id);
      var section = el && el.closest('.page');
      if (section) {
        page = section.id;
        target = el;
      }
    }
    page = page || 'home';
    var changed = currentPage() !== page;
    showPage(page);
    setNav(false);
    if (target) {
      target.scrollIntoView();
    } else if (fromUser) {
      window.scrollTo(0, 0);
      if (changed) focusPageHeading(false);
    }
  }

  window.addEventListener('hashchange', function () {
    route(true);
  });

  // Clicking the tab you are already on scrolls back to the top.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('data-skip-link')) return;
    var id = link.getAttribute('href').slice(1);
    var sameHash = location.hash === '#' + id || (!location.hash && id === 'home');
    if (isPage(id) && sameHash) {
      e.preventDefault();
      setNav(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  var skipLink = $('[data-skip-link]');
  if (skipLink) {
    skipLink.addEventListener('click', function (e) {
      e.preventDefault();
      focusPageHeading(true);
    });
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('nav-open')) {
        setNav(false);
        navToggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (root.classList.contains('nav-open') && !e.target.closest('[data-header]')) setNav(false);
    });
    var wide = window.matchMedia('(min-width: 961px)');
    if (wide.addEventListener) {
      wide.addEventListener('change', function () {
        if (wide.matches) setNav(false);
      });
    }
  }

  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var backToTop = $('[data-back-to-top]');
  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      focusPageHeading(false);
    });
  }

  route(false);

  /* ---------- Links and email from assets/js/config.js ---------- */

  function initConfigLinks() {
    $$('[data-config-href]').forEach(function (link) {
      var url = String(config[link.getAttribute('data-config-href')] || '').trim();
      if (url) {
        link.href = url;
        return;
      }
      // Not configured yet: show a non-interactive "coming soon" state.
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.setAttribute('aria-disabled', 'true');
      link.classList.add('is-pending');
      var label = $('[data-label]', link);
      var pending = link.getAttribute('data-pending-label');
      if (label && pending) label.textContent = pending;
      var use = $('use', link);
      if (use) use.setAttribute('href', '#i-clock');
    });

    var email = String(config.contactEmail || '').trim();
    $$('[data-config-email]').forEach(function (link) {
      if (email) {
        link.href = 'mailto:' + email;
        var text = $('[data-email-text]', link);
        if (text) text.textContent = email;
      } else {
        link.removeAttribute('href');
        if (link.classList.contains('btn')) link.classList.add('is-pending');
      }
    });
  }

  /* ---------- Slide viewer (Agenda) ---------- */

  function initSlides() {
    var viewer = $('[data-viewer]');
    if (!viewer) return;
    var data = window.WORKSHOP_SLIDES;
    if (!data || !data.slides || !data.slides.length) {
      viewer.hidden = true;
      return;
    }

    var slides = data.slides;
    var stage = $('[data-slide-stage]', viewer);
    var img = $('[data-slide-img]', viewer);
    var prev = $('[data-slide-prev]', viewer);
    var next = $('[data-slide-next]', viewer);
    var count = $('[data-slide-count]', viewer);
    var title = $('[data-slide-title]', viewer);
    var live = $('[data-slide-live]', viewer);
    var thumbs = $('[data-slide-thumbs]', viewer);
    var fullscreenBtn = $('[data-slide-fullscreen]', viewer);
    var exitBtn = $('[data-slide-exit]', viewer);
    var index = -1;

    if (data.pdf) {
      $$('[data-slides-pdf]').forEach(function (link) {
        link.href = data.pdf;
      });
    }

    slides.forEach(function (slide, i) {
      var button = h('button', {
        type: 'button',
        class: 'viewer__thumb',
        'aria-label': 'Slide ' + (i + 1) + (slide.title ? ': ' + slide.title : '')
      }, [
        h('img', { src: slide.thumb || slide.src, alt: '', loading: 'lazy', width: '192', height: '108' }),
        h('span', { class: 'viewer__thumb-num', 'aria-hidden': 'true', text: String(i + 1) })
      ]);
      button.addEventListener('click', function () {
        go(i);
      });
      thumbs.appendChild(button);
    });

    img.addEventListener('load', function () {
      img.classList.remove('is-loading');
    });

    function go(i, announce) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (i === index) return;
      index = i;
      var slide = slides[i];
      var label = 'Slide ' + (i + 1) + ' of ' + slides.length + (slide.title ? ': ' + slide.title : '');

      if (img.getAttribute('src') !== slide.src) {
        img.classList.add('is-loading');
        img.src = slide.src;
      }
      img.alt = label;
      count.textContent = (i + 1) + ' / ' + slides.length;
      title.textContent = slide.title || '';
      if (announce !== false) live.textContent = label;

      // Keep keyboard focus on a visible arrow when one end is reached.
      var focusPrev = document.activeElement === next && i === slides.length - 1;
      var focusNext = document.activeElement === prev && i === 0;
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
      if (focusPrev) prev.focus();
      if (focusNext) next.focus();

      $$('.viewer__thumb', thumbs).forEach(function (button, j) {
        button.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
      var active = thumbs.children[i];
      thumbs.scrollTo({ left: active.offsetLeft - (thumbs.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });

      [i - 1, i + 1].forEach(function (j) {
        if (slides[j]) new Image().src = slides[j].src;
      });
    }

    prev.addEventListener('click', function () {
      go(index - 1);
    });
    next.addEventListener('click', function () {
      go(index + 1);
    });

    function isFullscreen() {
      return (document.fullscreenElement || document.webkitFullscreenElement) === stage;
    }

    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!isFullscreen() && !viewer.contains(document.activeElement)) return;
      var key = e.key;
      if (key === 'ArrowRight' || key === 'PageDown' || (key === ' ' && isFullscreen())) go(index + 1);
      else if (key === 'ArrowLeft' || key === 'PageUp') go(index - 1);
      else if (key === 'Home') go(0);
      else if (key === 'End') go(slides.length - 1);
      else return;
      e.preventDefault();
    });

    // Swipe on touch screens.
    var startX = null;
    var startY = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      startX = e.clientX;
      startY = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', function () {
      startX = null;
    });

    var requestFs = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var exitFs = document.exitFullscreen || document.webkitExitFullscreen;
    if (!requestFs) {
      fullscreenBtn.hidden = true;
    } else {
      fullscreenBtn.addEventListener('click', function () {
        var result = requestFs.call(stage);
        if (result && result.catch) result.catch(function () {});
      });
      exitBtn.addEventListener('click', function () {
        if (exitFs) exitFs.call(document);
      });
      var onFullscreenChange = function () {
        if (isFullscreen()) exitBtn.focus();
        else if (!viewer.contains(document.activeElement) || stage.contains(document.activeElement)) fullscreenBtn.focus();
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    }

    go(0, false);
  }

  /* ---------- Red-teaming examples explorer ---------- */

  function initExamples() {
    var list = $('[data-risk-list]');
    var panel = $('[data-example-panel]');
    var bar = $('[data-intent-bar]');
    if (!list || !panel) return;

    var data = window.FRED_EXAMPLES || {};
    var risks = data.risks || [];
    if (!risks.length) {
      panel.appendChild(h('p', { class: 'example__empty', text: 'Examples will be added soon.' }));
      return;
    }

    var INTENTS = {
      benign: { label: 'Benign intent', icon: 'heart' },
      adversarial: { label: 'Adversarial intent', icon: 'mask' }
    };
    var checked = $('input[name="intent"]:checked');
    var state = { intent: checked && INTENTS[checked.value] ? checked.value : 'benign', index: 0 };

    if (data.sample) {
      var note = $('[data-sample-note]');
      if (note) note.hidden = false;
    }

    var tabs = risks.map(function (risk, i) {
      var tab = h('button', {
        type: 'button',
        class: 'risk-tab',
        role: 'tab',
        id: 'risk-tab-' + i,
        'aria-controls': 'example-panel',
        'aria-selected': 'false',
        tabindex: '-1'
      }, [
        h('span', { class: 'risk-tab__index', 'aria-hidden': 'true', text: pad(i + 1) }),
        h('span', { class: 'risk-tab__name', text: risk.name })
      ]);
      tab.addEventListener('click', function () {
        select(i);
      });
      list.appendChild(tab);
      return tab;
    });

    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var target = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') target = (i + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') target = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') target = 0;
      else if (e.key === 'End') target = tabs.length - 1;
      if (target === null) return;
      e.preventDefault();
      select(target);
      tabs[target].focus();
    });

    // The list is vertical next to the example, and a row of chips on small screens.
    var vertical = window.matchMedia('(min-width: 901px)');
    var syncOrientation = function () {
      list.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
    };
    syncOrientation();
    if (vertical.addEventListener) vertical.addEventListener('change', syncOrientation);

    $$('input[name="intent"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.checked) setIntent(input.value);
      });
    });

    function applyIntent(intent) {
      state.intent = intent;
      var radio = document.getElementById('intent-' + intent);
      if (radio) radio.checked = true;
      if (bar) bar.classList.toggle('is-adversarial', intent === 'adversarial');
      $$('[data-intent-desc]').forEach(function (el) {
        el.hidden = el.getAttribute('data-intent-desc') !== intent;
      });
    }

    function setIntent(intent, fromPanel) {
      applyIntent(intent);
      render(fromPanel);
    }

    function select(i, fromPanel) {
      state.index = i;
      tabs.forEach(function (tab, j) {
        tab.setAttribute('aria-selected', String(j === i));
        tab.tabIndex = j === i ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tabs[i].id);
      if (list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: tabs[i].offsetLeft - 16, behavior: 'smooth' });
      }
      render(fromPanel);
    }

    function renderConversation(example) {
      var chat = h('ol', { class: 'chat', 'aria-label': 'Conversation' });
      var flags = 0;
      example.conversation.forEach(function (turn) {
        var isFred = turn.from === 'fred';
        var flagged = Boolean(turn.risk);
        if (flagged) flags++;

        var bubble = h('div', { class: 'msg__bubble', html: richText(turn.text) });
        if (flagged) bubble.appendChild(h('span', { class: 'msg__flag', 'aria-hidden': 'true', text: String(flags) }));

        var body = h('div', { class: 'msg__body' }, [
          h('span', { class: 'msg__who', text: isFred ? 'FRED' : example.userLabel || 'User' }),
          bubble
        ]);
        if (flagged) {
          body.appendChild(h('div', { class: 'annotation' }, [
            h('span', { class: 'annotation__num', 'aria-hidden': 'true', text: String(flags) }),
            h('p', null, [h('strong', { class: 'annotation__label', text: 'Risk appears here' }), turn.risk])
          ]));
        }

        chat.appendChild(h('li', { class: 'msg msg--' + (isFred ? 'fred' : 'user') + (flagged ? ' is-flagged' : '') }, [
          h('span', { class: 'msg__avatar', 'aria-hidden': 'true' }, [icon(isFred ? 'fred' : 'user')]),
          body
        ]));
      });
      return chat;
    }

    function render(fromPanel) {
      var risk = risks[state.index];
      var intent = state.intent;
      var other = intent === 'benign' ? 'adversarial' : 'benign';
      var example = risk.examples && risk.examples[intent];

      panel.textContent = '';
      panel.appendChild(h('div', { class: 'example__top' }, [
        h('span', { class: 'badge badge--' + intent }, [icon(INTENTS[intent].icon), INTENTS[intent].label])
      ]));
      panel.appendChild(h('h2', { class: 'example__title', text: risk.name }));
      if (risk.description) panel.appendChild(h('p', { class: 'example__desc', text: risk.description }));

      if (example && example.conversation && example.conversation.length) {
        panel.appendChild(h('p', { class: 'example__label' }, [icon('chat'), 'Conversation']));
        panel.appendChild(h('div', { class: 'chat-window' }, [renderConversation(example)]));
      } else {
        panel.appendChild(h('p', { class: 'example__empty', text: 'An example with ' + intent + ' intent will be added soon.' }));
      }

      var compare = h('button', { type: 'button', class: 'btn btn--secondary' }, [icon('swap'), 'See the ' + other + ' version']);
      compare.addEventListener('click', function () {
        setIntent(other, true);
      });
      var prevBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Previous risk' }, [icon('chevron-left')]);
      var nextBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Next risk' }, [icon('chevron-right')]);
      prevBtn.disabled = state.index === 0;
      nextBtn.disabled = state.index === risks.length - 1;
      prevBtn.addEventListener('click', function () {
        select(state.index - 1, true);
      });
      nextBtn.addEventListener('click', function () {
        select(state.index + 1, true);
      });
      panel.appendChild(h('div', { class: 'example__foot' }, [
        compare,
        h('div', { class: 'example__pager' }, [
          prevBtn,
          h('span', { text: 'Risk ' + (state.index + 1) + ' of ' + risks.length }),
          nextBtn
        ])
      ]));

      panel.classList.remove('is-entering');
      void panel.offsetWidth; // restart the entrance animation
      panel.classList.add('is-entering');

      // Re-rendered from a button inside the panel: keep focus and the top in view.
      if (fromPanel) {
        var offset = (header ? header.offsetHeight : 0) + 16;
        var top = panel.getBoundingClientRect().top;
        if (top < offset) window.scrollTo({ top: window.scrollY + top - offset, behavior: 'smooth' });
        panel.focus({ preventScroll: true });
      }
    }

    applyIntent(state.intent);
    select(0);
  }

  initConfigLinks();
  initSlides();
  initExamples();
})();
