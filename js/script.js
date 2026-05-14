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

/* ===== 食物合集 ===== */
(function () {

    // ---------- 状态缓存（替代 localStorage）----------
    var state = { items: [], tags: [] };

    // ---------- 标签颜色映射 ----------
    var TAG_COLORS = {
        '血上限': { bg: 'rgba(220,80,80,.18)',   border: 'rgba(220,80,80,.55)',   text: '#e87878' },
        '血回复': { bg: 'rgba(220,80,80,.10)',   border: 'rgba(220,80,80,.35)',   text: '#d4a0a0' },
        '耐上限': { bg: 'rgba(80,185,110,.18)',  border: 'rgba(80,185,110,.55)',  text: '#6abf86' },
        '耐回复': { bg: 'rgba(80,185,110,.10)',  border: 'rgba(80,185,110,.35)',  text: '#9ad4b0' },
        '魔上限': { bg: 'rgba(130,110,220,.18)', border: 'rgba(130,110,220,.55)', text: '#a090e0' },
        '魔回复': { bg: 'rgba(130,110,220,.10)', border: 'rgba(130,110,220,.35)', text: '#c0b0f0' }
    };
    var TAG_DEFAULT = { bg: 'rgba(212,168,87,.15)', border: 'rgba(212,168,87,.45)', text: '#f5d27a' };

    function tagChipStyle(tag) {
        var c = TAG_COLORS[tag] || TAG_DEFAULT;
        return 'background:' + c.bg + ';border-color:' + c.border + ';color:' + c.text + ';';
    }

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ---------- API 工具函数 ----------
    function apiGet(action) {
        return fetch('api.php?action=' + action).then(function (r) { return r.json(); });
    }
    function apiPost(action, data) {
        return fetch('api.php?action=' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    }

    function loadAll(callback) {
        apiGet('get_all').then(function (data) {
            state.items = data.items || [];
            state.tags  = data.tags  || [];
            if (callback) callback();
        }).catch(function () {
            console.error('加载数据失败，请检查 api.php 是否正常');
        });
    }

    // ---------- 搜索 & 筛选状态 ----------
    var searchQuery      = '';
    var activeFilterTags = [];

    function getFilteredItems() {
        var items = state.items.slice();
        if (searchQuery) {
            var q = searchQuery.toLowerCase();
            items = items.filter(function (i) { return i.name.toLowerCase().indexOf(q) >= 0; });
        }
        if (activeFilterTags.length) {
            items = items.filter(function (i) {
                return activeFilterTags.every(function (tag) { return (i.tags || []).indexOf(tag) >= 0; });
            });
        }
        return items;
    }

    function renderFilterBar() {
        var bar = document.getElementById('potionFilterTags');
        if (!bar) return;
        bar.innerHTML = state.tags.map(function (tag) {
            var active = activeFilterTags.indexOf(tag) >= 0;
            var c = TAG_COLORS[tag] || TAG_DEFAULT;
            var style = active
                ? 'background:' + c.bg + ';border-color:' + c.border + ';color:' + c.text + ';font-weight:700;'
                : 'color:' + c.text + ';border-color:' + c.border + ';';
            return '<button type="button" class="potions-filter-chip' + (active ? ' active' : '') + '" data-tag="' + esc(tag) + '" style="' + style + '">' + (active ? '✓ ' : '') + esc(tag) + '</button>';
        }).join('');
        bar.querySelectorAll('.potions-filter-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var tag = chip.getAttribute('data-tag');
                var idx = activeFilterTags.indexOf(tag);
                if (idx >= 0) activeFilterTags.splice(idx, 1);
                else activeFilterTags.push(tag);
                renderFilterBar();
                renderPotions();
            });
        });
    }

    var searchInput = document.getElementById('potionSearch');
    if (searchInput) searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        renderPotions();
    });

    // ---------- 渲染列表 ----------
    function renderPotions() {
        var grid = document.getElementById('potionsGrid');
        if (!grid) return;
        var items = getFilteredItems();
        if (!items.length) {
            grid.innerHTML = '<p class="potions-empty">暂无匹配条目</p>';
            return;
        }

        function cardHtml(item) {
            var tagsHtml = (item.tags || []).map(function (t) {
                return '<span class="p-tag-chip" style="' + tagChipStyle(t) + '">' + esc(t) + '</span>';
            }).join('');
            var imgHtml = item.image
                ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '">'
                : '<span class="pr-noimg">无图片</span>';
            return '<div class="food-card">'
                + '<div class="fc-img">' + imgHtml + '</div>'
                + '<div class="fc-body">'
                + '<span class="fc-name">' + esc(item.name) + '</span>'
                + '<div class="fc-tags">' + tagsHtml + '</div>'
                + '</div>'
                + '<button class="p-card-del" data-id="' + item.id + '" title="删除">×</button>'
                + '</div>';
        }

        grid.innerHTML = items.map(cardHtml).join('');

        grid.querySelectorAll('.p-card-del').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = parseInt(btn.getAttribute('data-id'), 10);
                if (!confirm('确定删除这条记录？')) return;
                apiPost('delete_item', { id: id }).then(function () {
                    loadAll(function () { renderFilterBar(); renderPotions(); });
                });
            });
        });

        // 点卡片打开编辑
        grid.querySelectorAll('.food-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('p-card-del')) return;
                if (e.target.tagName === 'IMG' && e.target.closest('.fc-img')) return;
                var id = parseInt(card.querySelector('.p-card-del').getAttribute('data-id'), 10);
                var item = state.items.find(function (i) { return i.id === id; });
                if (item) openModal(item);
            });
        });

        // 图片点击放大（复用已有灯箱）
        var lb    = document.getElementById('lightbox');
        var lbImg = document.getElementById('lightboxImg');
        grid.querySelectorAll('.fc-img img').forEach(function (img) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!lb || !lbImg) return;
                lbImg.src = img.src;
                lbImg.alt = img.alt || '';
                lb.classList.add('open');
                lb.setAttribute('aria-hidden', 'false');
            });
        });
    }

    // ---------- 弹窗 ----------
    var modal       = document.getElementById('potionModal');
    var imgInput    = document.getElementById('pImgInput');
    var imgPreview  = document.getElementById('pImgPreview');
    var nameInput   = document.getElementById('pNameInput');
    var tagsList    = document.getElementById('pTagsList');
    var newTagInput = document.getElementById('pNewTagInput');
    var addTagBtn   = document.getElementById('pAddTagBtn');
    var cancelBtn   = document.getElementById('pCancelBtn');
    var closeBtn    = document.getElementById('pCloseBtn');
    var saveBtn     = document.getElementById('pSaveBtn');
    var addBtn      = document.getElementById('addPotionBtn');
    var pendingImg  = null;
    var editingId   = null;

    function getCheckedTags() {
        if (!tagsList) return [];
        return Array.prototype.slice.call(tagsList.querySelectorAll('input:checked'))
            .map(function (cb) { return cb.value; });
    }

    function renderTagList(initChecked) {
        if (!tagsList) return;
        var checked = initChecked !== undefined ? initChecked : getCheckedTags();
        tagsList.innerHTML = state.tags.map(function (tag) {
            var chk = checked.indexOf(tag) >= 0 ? ' checked' : '';
            return '<label class="p-tag-row">'
                + '<input type="checkbox" value="' + esc(tag) + '"' + chk + '>'
                + '<span>' + esc(tag) + '</span>'
                + '<button type="button" class="p-tag-del-btn" data-tag="' + esc(tag) + '">×</button>'
                + '</label>';
        }).join('');

        tagsList.querySelectorAll('.p-tag-del-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var tag = btn.getAttribute('data-tag');
                apiPost('delete_tag', { name: tag }).then(function () {
                    loadAll(function () {
                        renderTagList(undefined);
                        renderFilterBar();
                        renderPotions();
                    });
                });
            });
        });
    }

    function openModal(item) {
        editingId  = item ? item.id : null;
        pendingImg = item ? (item.image || null) : null;

        var titleEl = modal ? modal.querySelector('.p-modal-head h4') : null;
        if (titleEl) titleEl.textContent = item ? '编辑条目' : '添加条目';

        if (imgPreview) {
            imgPreview.innerHTML = pendingImg
                ? '<img src="' + esc(pendingImg) + '" alt="预览">'
                : '<span>点击选择 / Ctrl+V 粘贴</span>';
        }

        if (nameInput)   nameInput.value  = item ? item.name : '';
        if (newTagInput) newTagInput.value = '';

        renderTagList(item ? (item.tags || []) : []);
        if (modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
    }

    function closeModal() {
        if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
    }

    function setPreviewImg(src) {
        pendingImg = src;
        if (imgPreview) imgPreview.innerHTML = '<img src="' + esc(src) + '" alt="预览">';
    }

    function fallbackBase64(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var MAX = 400, w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
                    else        { w = Math.round(w * MAX / h); h = MAX; }
                }
                var canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                setPreviewImg(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function loadImgFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        var fd = new FormData();
        fd.append('image', file);
        fetch('upload.php', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.path) {
                    setPreviewImg(data.path + '?t=' + Date.now());
                } else {
                    alert('图片上传失败：' + (data.error || '未知错误') + '\n将使用本地预览，图片不会保存到服务器。');
                    fallbackBase64(file);
                }
            })
            .catch(function (err) {
                alert('upload.php 无法访问：' + err + '\n请确认文件已上传到服务器。');
                fallbackBase64(file);
            });
    }

    if (imgInput) imgInput.addEventListener('change', function () {
        loadImgFile(imgInput.files[0]);
    });

    // 弹窗打开时支持 Ctrl+V 粘贴图片
    document.addEventListener('paste', function (e) {
        if (!modal || !modal.classList.contains('open')) return;
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                loadImgFile(items[i].getAsFile());
                break;
            }
        }
    });

    if (addBtn) addBtn.addEventListener('click', function () {
        var potionDetails = document.querySelector('#potions details');
        if (potionDetails) potionDetails.open = true;
        openModal();
    });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn)  closeBtn.addEventListener('click', closeModal);

    function doAddTag() {
        var val = newTagInput ? newTagInput.value.trim() : '';
        if (!val) return;
        if (state.tags.indexOf(val) >= 0) {
            // 标签已存在，直接勾选
            if (tagsList) {
                var cb = tagsList.querySelector('input[value="' + esc(val) + '"]');
                if (cb) cb.checked = true;
            }
            if (newTagInput) newTagInput.value = '';
            return;
        }
        var currentChecked = getCheckedTags();
        if (newTagInput) newTagInput.value = '';
        apiPost('save_tag', { name: val }).then(function () {
            loadAll(function () {
                renderTagList(currentChecked.concat([val]));
            });
        });
    }
    if (addTagBtn)   addTagBtn.addEventListener('click', doAddTag);
    if (newTagInput) newTagInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doAddTag(); }
    });

    if (saveBtn) saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        // 保存图片路径时去掉防缓存时间戳
        var imageToSave = pendingImg ? pendingImg.split('?')[0] : '';

        // 编辑模式且没有换图片，保留原图
        if (editingId !== null && !imageToSave) {
            var orig = state.items.find(function (i) { return i.id === editingId; });
            if (orig) imageToSave = (orig.image || '').split('?')[0];
        }

        var itemData = {
            id:    editingId || 0,
            name:  name,
            type:  '食物',
            tags:  getCheckedTags(),
            image: imageToSave
        };

        apiPost('save_item', itemData).then(function (res) {
            if (res.error) { alert('保存失败：' + res.error); return; }
            searchQuery      = '';
            activeFilterTags = [];
            if (searchInput) searchInput.value = '';
            var potionDetails = document.querySelector('#potions details');
            if (potionDetails) potionDetails.open = true;
            loadAll(function () { renderFilterBar(); renderPotions(); });
            closeModal();
        });
    });

    // ---------- 初始加载 ----------
    loadAll(function () {
        renderFilterBar();
        renderPotions();
    });
})();
