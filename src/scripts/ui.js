/**
 * UI interactions — burger menu, reveal animations, header scroll, skill bars, section nav, time display.
 */
(function() {
  // Burger menu
  var burger = document.querySelector('.burger');
  var mobileMenu = document.getElementById('mmenu');
  burger && burger.addEventListener('click', function() {
    document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', document.body.classList.contains('menu-open'));
  });
  mobileMenu && mobileMenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      document.body.classList.remove('menu-open');
      burger && burger.setAttribute('aria-expanded', 'false');
    });
  });

  // Reveal animations
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('in');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal], .mask').forEach(function(el) { observer.observe(el); });

  // Header scroll
  var header = document.getElementById('hdr');
  var SCROLL_THRESHOLD = 50;
  window.addEventListener('scroll', function() {
    if (window.scrollY > SCROLL_THRESHOLD) header && header.classList.add('scrolled');
    else header && header.classList.remove('scrolled');
  });

  // Skill bars
  var skillObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var span = entry.target.querySelector('span');
        if (span) span.style.width = span.dataset.lv;
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.skill-bar').forEach(function(bar) { skillObserver.observe(bar); });

  // Section nav
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav a');
  var NAV_OFFSET = 200;
  window.addEventListener('scroll', function() {
    var current = '';
    sections.forEach(function(section) {
      if (scrollY >= section.offsetTop - NAV_OFFSET) current = section.getAttribute('id') || '';
    });
    navLinks.forEach(function(link) {
      link.classList.remove('act');
      if (link.getAttribute('href') === '#' + current) link.classList.add('act');
    });
  });

  // Works index scroll spy
  var worksIndex = document.querySelector('.works-index');
  if (worksIndex) {
    var workLinks = worksIndex.querySelectorAll('a');
    var projects = [];
    workLinks.forEach(function(link) {
      var id = link.getAttribute('href');
      if (id && id.startsWith('#')) {
        var el = document.getElementById(id.slice(1));
        if (el) projects.push({ el: el, link: link });
      }
    });
    if (projects.length) {
      var scrollTimeout;
      window.addEventListener('scroll', function() {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(function() {
          scrollTimeout = null;
          var scrollY = window.scrollY + window.innerHeight * 0.4;
          var current = projects[0];
          for (var i = 0; i < projects.length; i++) {
            if (projects[i].el.offsetTop <= scrollY) current = projects[i];
          }
          workLinks.forEach(function(l) { l.classList.remove('act'); });
          if (current) {
            current.link.classList.add('act');
            if (worksIndex.scrollWidth > worksIndex.clientWidth) {
              var linkRect = current.link.getBoundingClientRect();
              var containerRect = worksIndex.getBoundingClientRect();
              if (linkRect.left < containerRect.left || linkRect.right > containerRect.right) {
                current.link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }
            }
          }
        }, 10);
      });
      window.dispatchEvent(new Event('scroll'));
    }
  }

  // Time display
  function updateTime() {
    var now = new Date();
    var timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.querySelectorAll('.time').forEach(function(el) { el.textContent = timeStr; });
  }
  updateTime();
  setInterval(updateTime, 1000);
})();
