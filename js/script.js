(function () {
    'use strict';

    // ===== 年份 =====
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ===== Hero 导航：点击自动展开目标区块，关闭其他 =====
    var allDetails = document.querySelectorAll('.card details');

    document.querySelectorAll('.hero-nav-hint a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function () {
            var targetId = a.getAttribute('href').slice(1);
            var targetSection = document.getElementById(targetId);
            if (!targetSection) return;
            var targetDetails = targetSection.querySelector('details');
            allDetails.forEach(function (det) {
                if (det === targetDetails) {
                    det.open = true;
                } else {
                    det.open = false;
                }
            });
        });
    });

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

/* ===== 冒险笔记 ===== */
(function () {

    var CATS = ['游戏机制', '副职业', '日常任务', '构筑技巧', '探索', '其他'];
    var CAT_ICON = { '游戏机制': '⚙', '副职业': '🔧', '日常任务': '📋', '构筑技巧': '⚔', '探索': '🗺', '其他': '📝' };

    var state = { items: [] };

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
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
        apiGet('get_tips').then(function (data) {
            state.items = data.items || [];
            if (callback) callback();
        }).catch(function () { console.error('笔记数据加载失败'); });
    }

    // ---------- 搜索 & 分类过滤 ----------
    var searchQuery = '';
    var activeCat   = '';

    function getFiltered() {
        var items = state.items.slice();
        if (activeCat) items = items.filter(function (i) { return i.category === activeCat; });
        if (searchQuery) {
            var q = searchQuery.toLowerCase();
            items = items.filter(function (i) { return i.content.toLowerCase().indexOf(q) >= 0; });
        }
        return items;
    }

    // 动态渲染分类筛选条（只显示数据库里实际有的分类）
    function renderFilterBar() {
        var bar = document.getElementById('tipCatFilter');
        if (!bar) return;
        // 统计每个分类的数量
        var counts = {};
        state.items.forEach(function (i) { counts[i.category] = (counts[i.category] || 0) + 1; });
        var present = CATS.filter(function (c) { return counts[c]; });

        var html = '<button class="tip-filter-chip' + (!activeCat ? ' active' : '') + '" data-cat="">全部 <em>' + state.items.length + '</em></button>';
        present.forEach(function (cat) {
            var icon = CAT_ICON[cat] || '';
            html += '<button class="tip-filter-chip' + (activeCat === cat ? ' active' : '') + '" data-cat="' + esc(cat) + '">'
                + icon + ' ' + esc(cat) + ' <em>' + counts[cat] + '</em></button>';
        });
        bar.innerHTML = html;

        bar.querySelectorAll('.tip-filter-chip').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeCat = btn.getAttribute('data-cat');
                renderFilterBar();
                renderTips();
            });
        });
    }

    var searchInput = document.getElementById('tipSearch');
    if (searchInput) searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        renderTips();
    });

    // ---------- 渲染笔记列表 ----------
    function renderTips() {
        var grid = document.getElementById('tipsGrid');
        if (!grid) return;
        var items = getFiltered();
        if (!items.length) {
            grid.innerHTML = '<p class="tips-empty">暂无匹配笔记</p>';
            return;
        }

        function cardHtml(item) {
            var cat  = item.category || '其他';
            var icon = CAT_ICON[cat] || '📝';
            return '<div class="tip-card" data-cat="' + esc(cat) + '" data-id="' + item.id + '">'
                + '<span class="tip-cat-badge">' + icon + ' ' + esc(cat) + '</span>'
                + '<p class="tip-content">' + esc(item.content) + '</p>'
                + '<button class="p-card-del" data-id="' + item.id + '" title="删除">×</button>'
                + '</div>';
        }

        grid.innerHTML = items.map(cardHtml).join('');

        grid.querySelectorAll('.p-card-del').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!confirm('确定删除这条笔记？')) return;
                var id = parseInt(btn.getAttribute('data-id'), 10);
                apiPost('delete_tip', { id: id }).then(function () {
                    loadAll(function () { renderFilterBar(); renderTips(); });
                });
            });
        });

        // 点卡片编辑
        grid.querySelectorAll('.tip-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('p-card-del')) return;
                var id = parseInt(card.getAttribute('data-id'), 10);
                var item = state.items.find(function (i) { return i.id === id; });
                if (item) openModal(item);
            });
        });
    }

    // ---------- 弹窗 ----------
    var modal       = document.getElementById('tipModal');
    var catSelect   = document.getElementById('tipCatSelect');
    var contentInput= document.getElementById('tipContentInput');
    var cancelBtn   = document.getElementById('tipCancelBtn');
    var closeBtn    = document.getElementById('tipCloseBtn');
    var saveBtn     = document.getElementById('tipSaveBtn');
    var addBtn      = document.getElementById('addTipBtn');
    var editingId   = null;

    function getSelectedCat() {
        if (!catSelect) return '其他';
        var active = catSelect.querySelector('.tip-cat-opt.active');
        return active ? active.getAttribute('data-cat') : '其他';
    }
    function setSelectedCat(cat) {
        if (!catSelect) return;
        catSelect.querySelectorAll('.tip-cat-opt').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-cat') === cat);
        });
    }
    if (catSelect) {
        catSelect.addEventListener('click', function (e) {
            var btn = e.target.closest('.tip-cat-opt');
            if (!btn) return;
            catSelect.querySelectorAll('.tip-cat-opt').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    }

    function openModal(item) {
        editingId = item ? item.id : null;
        var titleEl = modal ? modal.querySelector('.p-modal-head h4') : null;
        if (titleEl) titleEl.textContent = item ? '编辑笔记' : '添加笔记';
        if (contentInput) contentInput.value = item ? item.content : '';
        setSelectedCat(item ? (item.category || '其他') : '游戏机制');
        if (modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
        if (contentInput) setTimeout(function () { contentInput.focus(); }, 50);
    }
    function closeModal() {
        if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
    }

    if (addBtn) addBtn.addEventListener('click', function () {
        var det = document.querySelector('#tips details');
        if (det) det.open = true;
        openModal(null);
    });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn)  closeBtn.addEventListener('click', closeModal);

    if (saveBtn) saveBtn.addEventListener('click', function () {
        var content = contentInput ? contentInput.value.trim() : '';
        if (!content) { if (contentInput) contentInput.focus(); return; }

        apiPost('save_tip', { id: editingId || 0, category: getSelectedCat(), content: content })
            .then(function (res) {
                if (res.error) { alert('保存失败：' + res.error); return; }
                searchQuery = '';
                if (searchInput) searchInput.value = '';
                var det = document.querySelector('#tips details');
                if (det) det.open = true;
                loadAll(function () { renderFilterBar(); renderTips(); });
                closeModal();
            });
    });

    // ---------- 初始加载 ----------
    loadAll(function () { renderFilterBar(); renderTips(); });
})();

/* ===== 装备合集 ===== */
(function () {

    var state = { items: [] };

    var ROLE_CLASS = { '输出': 'role-dps', '坦克': 'role-tank', '奶妈': 'role-heal' };
    var ROLE_LABEL = { '输出': '⚔ 输出', '坦克': '🛡 坦克', '奶妈': '✚ 奶妈' };

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

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
        apiGet('get_equipment').then(function (data) {
            state.items = data.items || [];
            if (callback) callback();
        }).catch(function () {
            console.error('装备数据加载失败');
        });
    }

    // ---------- 搜索 & 职业筛选状态 ----------
    var searchQuery  = '';
    var activeRole   = '';

    function getFiltered() {
        var items = state.items.slice();
        if (activeRole) {
            items = items.filter(function (i) { return (i.role || '输出') === activeRole; });
        }
        if (searchQuery) {
            var q = searchQuery.toLowerCase();
            items = items.filter(function (i) { return i.name.toLowerCase().indexOf(q) >= 0; });
        }
        return items;
    }

    var searchInput = document.getElementById('equipSearch');
    if (searchInput) searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        renderEquip();
    });

    // 职业 Tab 点击
    var roleTabs = document.getElementById('equipRoleTabs');
    if (roleTabs) {
        roleTabs.addEventListener('click', function (e) {
            var btn = e.target.closest('.equip-role-tab');
            if (!btn) return;
            activeRole = btn.getAttribute('data-role');
            roleTabs.querySelectorAll('.equip-role-tab').forEach(function (t) {
                t.classList.toggle('active', t === btn);
            });
            renderEquip();
        });
    }

    // ---------- 渲染列表 ----------
    function renderEquip() {
        var grid = document.getElementById('equipGrid');
        if (!grid) return;
        var items = getFiltered();
        if (!items.length) {
            grid.innerHTML = '<p class="equip-empty">暂无匹配装备</p>';
            return;
        }

        function cardHtml(item) {
            var role       = item.role || '输出';
            var roleClass  = ROLE_CLASS[role] || 'role-dps';
            var roleLabel  = ROLE_LABEL[role] || role;
            var imgHtml    = item.image
                ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '">'
                : '<span class="ec-noimg">无图片</span>';
            return '<div class="equip-card">'
                + '<div class="ec-img">'
                +   imgHtml
                +   '<span class="ec-role-badge ' + roleClass + '">' + roleLabel + '</span>'
                + '</div>'
                + '<div class="ec-body"><span class="ec-name">' + esc(item.name) + '</span></div>'
                + '<button class="p-card-del" data-id="' + item.id + '" title="删除">×</button>'
                + '</div>';
        }

        grid.innerHTML = items.map(cardHtml).join('');

        grid.querySelectorAll('.p-card-del').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!confirm('确定删除这件装备？')) return;
                var id = parseInt(btn.getAttribute('data-id'), 10);
                apiPost('delete_equipment', { id: id }).then(function () {
                    loadAll(renderEquip);
                });
            });
        });

        // 点卡片打开编辑
        grid.querySelectorAll('.equip-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('p-card-del')) return;
                if (e.target.tagName === 'IMG' && e.target.closest('.ec-img')) return;
                var id = parseInt(card.querySelector('.p-card-del').getAttribute('data-id'), 10);
                var item = state.items.find(function (i) { return i.id === id; });
                if (item) openModal(item);
            });
        });

        // 图片点击放大（复用灯箱）
        var lb    = document.getElementById('lightbox');
        var lbImg = document.getElementById('lightboxImg');
        grid.querySelectorAll('.ec-img img').forEach(function (img) {
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
    var modal      = document.getElementById('equipModal');
    var imgInput   = document.getElementById('eImgInput');
    var imgPreview = document.getElementById('eImgPreview');
    var nameInput  = document.getElementById('eNameInput');
    var roleSelect = document.getElementById('eRoleSelect');
    var cancelBtn  = document.getElementById('eCancelBtn');
    var closeBtn   = document.getElementById('eCloseBtn');
    var saveBtn    = document.getElementById('eSaveBtn');
    var addBtn     = document.getElementById('addEquipBtn');
    var pendingImg = null;
    var editingId  = null;

    function getSelectedRole() {
        if (!roleSelect) return '输出';
        var active = roleSelect.querySelector('.equip-role-opt.active');
        return active ? active.getAttribute('data-role') : '输出';
    }

    function setSelectedRole(role) {
        if (!roleSelect) return;
        roleSelect.querySelectorAll('.equip-role-opt').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-role') === role);
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener('click', function (e) {
            var btn = e.target.closest('.equip-role-opt');
            if (!btn) return;
            roleSelect.querySelectorAll('.equip-role-opt').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    }

    function openModal(item) {
        editingId  = item ? item.id : null;
        pendingImg = item ? (item.image || null) : null;

        var titleEl = modal ? modal.querySelector('.p-modal-head h4') : null;
        if (titleEl) titleEl.textContent = item ? '编辑装备' : '添加装备';

        if (imgPreview) {
            imgPreview.innerHTML = pendingImg
                ? '<img src="' + esc(pendingImg) + '" alt="预览">'
                : '<span>点击选择 / Ctrl+V 粘贴</span>';
        }
        if (nameInput) nameInput.value = item ? item.name : '';
        setSelectedRole(item ? (item.role || '输出') : '输出');
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
                var MAX = 500, w = img.width, h = img.height;
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
        fd.append('type', 'equipment');
        fetch('upload.php', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.path) {
                    setPreviewImg(data.path + '?t=' + Date.now());
                } else {
                    alert('图片上传失败：' + (data.error || '未知错误') + '\n将使用本地预览。');
                    fallbackBase64(file);
                }
            })
            .catch(function () { fallbackBase64(file); });
    }

    if (imgInput) imgInput.addEventListener('change', function () {
        loadImgFile(imgInput.files[0]);
    });

    // Ctrl+V 粘贴图片
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
        var det = document.querySelector('#equipment details');
        if (det) det.open = true;
        openModal(null);
    });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn)  closeBtn.addEventListener('click', closeModal);

    if (saveBtn) saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        var imageToSave = pendingImg ? pendingImg.split('?')[0] : '';
        if (editingId !== null && !imageToSave) {
            var orig = state.items.find(function (i) { return i.id === editingId; });
            if (orig) imageToSave = (orig.image || '').split('?')[0];
        }

        apiPost('save_equipment', { id: editingId || 0, name: name, role: getSelectedRole(), image: imageToSave })
            .then(function (res) {
                if (res.error) { alert('保存失败：' + res.error); return; }
                searchQuery = '';
                if (searchInput) searchInput.value = '';
                var det = document.querySelector('#equipment details');
                if (det) det.open = true;
                loadAll(renderEquip);
                closeModal();
            });
    });

    // ---------- 初始加载 ----------
    loadAll(renderEquip);
})();

/* ===== 装备构筑 ===== */
(function () {

    var state = { items: [] };

    var ROLE_CLASS = { '输出': 'role-dps', '坦克': 'role-tank', '奶妈': 'role-heal' };
    var ROLE_LABEL = { '输出': '⚔ 输出', '坦克': '🛡 坦克', '奶妈': '✚ 奶妈' };

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

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
        apiGet('get_builds').then(function (data) {
            state.items = data.items || [];
            if (callback) callback();
        }).catch(function () { console.error('构筑数据加载失败'); });
    }

    // ---------- 搜索 & 职业筛选 ----------
    var searchQuery = '';
    var activeRole  = '';

    function getFiltered() {
        var items = state.items.slice();
        if (activeRole) items = items.filter(function (i) { return (i.role || '输出') === activeRole; });
        if (searchQuery) {
            var q = searchQuery.toLowerCase();
            items = items.filter(function (i) { return i.name.toLowerCase().indexOf(q) >= 0; });
        }
        return items;
    }

    var searchInput = document.getElementById('buildSearch');
    if (searchInput) searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        renderBuilds();
    });

    var roleTabs = document.getElementById('buildRoleTabs');
    if (roleTabs) {
        roleTabs.addEventListener('click', function (e) {
            var btn = e.target.closest('.equip-role-tab');
            if (!btn) return;
            activeRole = btn.getAttribute('data-role');
            roleTabs.querySelectorAll('.equip-role-tab').forEach(function (t) {
                t.classList.toggle('active', t === btn);
            });
            renderBuilds();
        });
    }

    // ---------- 渲染列表 ----------
    function renderBuilds() {
        var grid = document.getElementById('buildGrid');
        if (!grid) return;
        var items = getFiltered();
        if (!items.length) {
            grid.innerHTML = '<p class="equip-empty">暂无匹配构筑</p>';
            return;
        }

        function cardHtml(item) {
            var role      = item.role || '输出';
            var roleClass = ROLE_CLASS[role] || 'role-dps';
            var roleLabel = ROLE_LABEL[role] || role;
            var imgHtml   = item.image
                ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '">'
                : '<span class="ec-noimg">无图片</span>';
            return '<div class="equip-card">'
                + '<div class="ec-img">'
                +   imgHtml
                +   '<span class="ec-role-badge ' + roleClass + '">' + roleLabel + '</span>'
                + '</div>'
                + '<div class="ec-body"><span class="ec-name">' + esc(item.name) + '</span></div>'
                + '<button class="p-card-del" data-id="' + item.id + '" title="删除">×</button>'
                + '</div>';
        }

        grid.innerHTML = items.map(cardHtml).join('');

        grid.querySelectorAll('.p-card-del').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!confirm('确定删除这条构筑？')) return;
                var id = parseInt(btn.getAttribute('data-id'), 10);
                apiPost('delete_build', { id: id }).then(function () { loadAll(renderBuilds); });
            });
        });

        grid.querySelectorAll('.equip-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('p-card-del')) return;
                if (e.target.tagName === 'IMG' && e.target.closest('.ec-img')) return;
                var id = parseInt(card.querySelector('.p-card-del').getAttribute('data-id'), 10);
                var item = state.items.find(function (i) { return i.id === id; });
                if (item) openModal(item);
            });
        });

        var lb    = document.getElementById('lightbox');
        var lbImg = document.getElementById('lightboxImg');
        grid.querySelectorAll('.ec-img img').forEach(function (img) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!lb || !lbImg) return;
                lbImg.src = img.src; lbImg.alt = img.alt || '';
                lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
            });
        });
    }

    // ---------- 弹窗 ----------
    var modal      = document.getElementById('buildModal');
    var imgInput   = document.getElementById('bdImgInput');
    var imgPreview = document.getElementById('bdImgPreview');
    var nameInput  = document.getElementById('bdNameInput');
    var roleSelect = document.getElementById('bdRoleSelect');
    var cancelBtn  = document.getElementById('bdCancelBtn');
    var closeBtn   = document.getElementById('bdCloseBtn');
    var saveBtn    = document.getElementById('bdSaveBtn');
    var addBtn     = document.getElementById('addBuildBtn');
    var pendingImg = null;
    var editingId  = null;

    function getSelectedRole() {
        if (!roleSelect) return '输出';
        var active = roleSelect.querySelector('.equip-role-opt.active');
        return active ? active.getAttribute('data-role') : '输出';
    }
    function setSelectedRole(role) {
        if (!roleSelect) return;
        roleSelect.querySelectorAll('.equip-role-opt').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-role') === role);
        });
    }
    if (roleSelect) {
        roleSelect.addEventListener('click', function (e) {
            var btn = e.target.closest('.equip-role-opt');
            if (!btn) return;
            roleSelect.querySelectorAll('.equip-role-opt').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    }

    function openModal(item) {
        editingId  = item ? item.id : null;
        pendingImg = item ? (item.image || null) : null;
        var titleEl = modal ? modal.querySelector('.p-modal-head h4') : null;
        if (titleEl) titleEl.textContent = item ? '编辑构筑' : '添加构筑';
        if (imgPreview) {
            imgPreview.innerHTML = pendingImg
                ? '<img src="' + esc(pendingImg) + '" alt="预览">'
                : '<span>点击选择 / Ctrl+V 粘贴</span>';
        }
        if (nameInput) nameInput.value = item ? item.name : '';
        setSelectedRole(item ? (item.role || '输出') : '输出');
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
                var MAX = 500, w = img.width, h = img.height;
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
        fd.append('type', 'equipment');
        fetch('upload.php', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.path) { setPreviewImg(data.path + '?t=' + Date.now()); }
                else { alert('图片上传失败：' + (data.error || '未知错误')); fallbackBase64(file); }
            })
            .catch(function () { fallbackBase64(file); });
    }

    if (imgInput) imgInput.addEventListener('change', function () { loadImgFile(imgInput.files[0]); });

    document.addEventListener('paste', function (e) {
        if (!modal || !modal.classList.contains('open')) return;
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) { loadImgFile(items[i].getAsFile()); break; }
        }
    });

    if (addBtn) addBtn.addEventListener('click', function () {
        var det = document.querySelector('#builds details');
        if (det) det.open = true;
        openModal(null);
    });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn)  closeBtn.addEventListener('click', closeModal);

    if (saveBtn) saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        var imageToSave = pendingImg ? pendingImg.split('?')[0] : '';
        if (editingId !== null && !imageToSave) {
            var orig = state.items.find(function (i) { return i.id === editingId; });
            if (orig) imageToSave = (orig.image || '').split('?')[0];
        }

        apiPost('save_build', { id: editingId || 0, name: name, role: getSelectedRole(), image: imageToSave })
            .then(function (res) {
                if (res.error) { alert('保存失败：' + res.error); return; }
                searchQuery = '';
                if (searchInput) searchInput.value = '';
                var det = document.querySelector('#builds details');
                if (det) det.open = true;
                loadAll(renderBuilds);
                closeModal();
            });
    });

    // ---------- 初始加载 ----------
    loadAll(renderBuilds);

    // ===== 返回顶部按钮 =====
    var scrollTopBtn = document.getElementById('scrollTop');
    if (scrollTopBtn) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 400) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }, { passive: true });

        scrollTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();
