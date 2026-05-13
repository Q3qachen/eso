(function () {
    'use strict';

    // ===== 年份 =====
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ===== 移动端导航 =====
    var nav = document.getElementById('nav');
    var navToggle = document.getElementById('navToggle');
    if (navToggle && nav) {
        navToggle.addEventListener('click', function () {
            nav.classList.toggle('open');
        });
        nav.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                nav.classList.remove('open');
            });
        });
    }

    // ===== 滚动高亮当前章节 =====
    var navLinks = nav ? nav.querySelectorAll('a[href^="#"]') : [];
    var sections = Array.prototype.map.call(navLinks, function (a) {
        var id = a.getAttribute('href').slice(1);
        return { id: id, el: document.getElementById(id), link: a };
    }).filter(function (s) { return s.el; });

    function onScroll() {
        var fromTop = window.scrollY + 120;
        var current = sections[0];
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].el.offsetTop <= fromTop) current = sections[i];
        }
        sections.forEach(function (s) {
            if (s === current) s.link.style.color = 'var(--gold-2)';
            else s.link.style.color = '';
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ===== 图片灯箱 =====
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightboxImg');
    var lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;

    document.querySelectorAll('img[data-zoom]').forEach(function (img) {
        img.addEventListener('click', function () {
            if (!lightbox || !lightboxImg) return;
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt || '';
            lightbox.classList.add('open');
            lightbox.setAttribute('aria-hidden', 'false');
        });
    });

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        if (lightboxImg) lightboxImg.src = '';
    }
    if (lightbox) lightbox.addEventListener('click', closeLightbox);
    if (lightboxClose) lightboxClose.addEventListener('click', function (e) {
        e.stopPropagation();
        closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
    });

    // ===== 日常清单本地保存 =====
    document.querySelectorAll('.daily-item input[type="checkbox"]').forEach(function (cb) {
        var key = cb.getAttribute('data-key');
        if (!key) return;
        try {
            if (localStorage.getItem(key) === '1') cb.checked = true;
        } catch (e) {}
        cb.addEventListener('change', function () {
            try {
                localStorage.setItem(key, cb.checked ? '1' : '0');
            } catch (e) {}
        });
    });

})();
