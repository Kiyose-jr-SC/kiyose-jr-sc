/*
 * 共通の動き（メニュー・お知らせ・試合結果・フォーム・ダイアログ）
 * 設定は ../config.js にあります。通常は、このファイルを触る必要はありません。
 */
(function () {
  'use strict';
  var CFG = window.SITE_CONFIG || {};
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];

  /* ---------- ちいさな道具 ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function isHttps(u) { return typeof u === 'string' && /^https:\/\//.test(u); }
  /* https で、ホストが許可リストに合うURLだけ通す（それ以外は無かったことにする） */
  function parseUrl(u) { try { return new URL(u); } catch (e) { return null; } }
  /* Googleフォームか。allowShort が true のときは、短縮URL（forms.gle）も通す（埋め込み embedUrl は docs.google.com だけ） */
  function isGoogleFormUrl(u, allowShort) {
    var p = isHttps(u) && parseUrl(u);
    if (!p) return false;
    if (p.hostname === 'docs.google.com' && /^\/forms\//.test(p.pathname)) return true;
    return !!allowShort && p.hostname === 'forms.gle' && p.pathname.length > 1;
  }
  function isLineUrl(u) {
    var p = isHttps(u) && parseUrl(u);
    return !!p && (p.hostname === 'lin.ee' || p.hostname === 'line.me' || /\.line\.me$/.test(p.hostname));
  }
  /* 埋め込み用：embedded=true を付ける／外す */
  function formEmbedSrc(u) { var p = parseUrl(u); p.searchParams.set('embedded', 'true'); return p.toString(); }
  function formViewSrc(u) { var p = parseUrl(u); p.searchParams.delete('embedded'); return p.toString(); }
  function parseYMD(s) {
    var m = /(\d{4})\s*[-\/.年]\s*(\d{1,2})\s*[-\/.月]\s*(\d{1,2})/.exec(String(s || ''));
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }
  function weekdayOf(p) { return WEEK[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  window.SiteUtil = { el: el, isHttps: isHttps, parseYMD: parseYMD, weekdayOf: weekdayOf, pad: pad, WEEK: WEEK };

  /* ---------- ダイアログ（予定の詳細・チラシの拡大など） ---------- */
  var dlg;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'site-dialog';
    dlg.setAttribute('aria-labelledby', 'site-dialog-title');
    dlg.innerHTML =
      '<div class="dlg-head"><h2 id="site-dialog-title" class="dlg-title"></h2>' +
      '<button type="button" class="dlg-close" aria-label="閉じる">閉じる</button></div>' +
      '<div class="dlg-body"></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.dlg-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    return dlg;
  }
  window.SiteDialog = {
    open: function (title, node, wide) {
      var d = ensureDialog();
      d.querySelector('.dlg-title').textContent = title;
      var body = d.querySelector('.dlg-body');
      body.textContent = '';
      body.appendChild(node);
      d.classList.toggle('wide', !!wide);
      if (!d.open) d.showModal();
    }
  };

  /* ---------- メニュー（スマホ） ---------- */
  function initMenu() {
    var btn = document.querySelector('.menu-btn');
    var nav = document.getElementById('gnav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- チラシなどの拡大 ---------- */
  function initLightbox() {
    document.querySelectorAll('[data-lightbox]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var img = el('img', 'lb-img');
        img.src = a.getAttribute('href');
        img.alt = a.getAttribute('data-alt') || '';
        SiteDialog.open(a.getAttribute('data-title') || '', img, true);
      });
    });
  }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else { q = false; } }
        else cur += c;
      } else if (c === '"') { q = true; }
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function rowsToObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).filter(function (r) { return r.some(function (v) { return v.trim() !== ''; }); })
      .map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); }); return o; });
  }
  function sheetUrl(kind) {
    var s = CFG.sheets || {};
    var direct = kind === 'news' ? s.newsCsvUrl : s.resultsCsvUrl;
    return direct && isHttps(direct) ? direct : '';
  }
  function loadSheet(kind) {
    var url = sheetUrl(kind);
    if (!url) return Promise.reject(new Error('no-url'));
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.text();
    }).then(function (t) {
      if (/^\s*<(!doctype|html)/i.test(t)) throw new Error('not-csv');
      return rowsToObjects(parseCSV(t));
    });
  }

  /* ---------- お知らせ ---------- */
  function tagClass(t) {
    if (/変更|中止|雨天|延期/.test(t)) return 'tag-red';
    if (/体験/.test(t)) return 'tag-navy';
    if (/イベント|大会|試合/.test(t)) return 'tag-yellow';
    return 'tag-plain';
  }
  function newsItem(o) {
    var p = parseYMD(o.date);
    var li = el('li', 'news-item');
    var t = el('time', 'nd');
    if (p) {
      t.setAttribute('datetime', p.y + '-' + pad(p.m) + '-' + pad(p.d));
      t.appendChild(el('span', 'nd-y', String(p.y)));
      t.appendChild(el('span', 'nd-md', p.m + '.' + p.d));
      t.appendChild(el('span', 'nd-w', weekdayOf(p)));
    } else { t.appendChild(el('span', 'nd-md', o.date || '')); }
    var body = el('div', 'nbody');
    if (o.tag) body.appendChild(el('span', 'tag ' + tagClass(o.tag), o.tag));
    body.appendChild(el('h3', 'nt', o.title));
    if (o.detail) body.appendChild(el('p', 'nx', o.detail));
    li.appendChild(t); li.appendChild(body);
    return li;
  }
  function initNews() {
    var lists = document.querySelectorAll('[data-news]');
    if (!lists.length || !sheetUrl('news')) return;
    loadSheet('news').then(function (rows) {
      var seen = {}, items = [];
      rows.forEach(function (r) {
        var st = r['掲載状態'];
        if (st !== undefined && st !== '' && st !== '公開中') return;
        var title = r['タイトル'];
        if (!title) return;
        var key = (r['日付'] || '') + '|' + title;
        if (seen[key]) return; seen[key] = 1;
        items.push({ date: r['日付'], tag: r['カテゴリ'], title: title, detail: r['詳細'], _t: (parseYMD(r['日付']) || { y: 0, m: 0, d: 0 }) });
      });
      if (!items.length) return;
      items.sort(function (a, b) { return (b._t.y * 10000 + b._t.m * 100 + b._t.d) - (a._t.y * 10000 + a._t.m * 100 + a._t.d); });
      lists.forEach(function (ul) {
        var limit = parseInt(ul.getAttribute('data-limit') || '0', 10);
        var shown = limit ? items.slice(0, limit) : items;
        ul.textContent = '';
        shown.forEach(function (o) { ul.appendChild(newsItem(o)); });
      });
    }).catch(function () { /* 読めなかったときは、HTMLに書いてある内容のまま */ });
  }

  /* ---------- 試合結果 ---------- */
  function resultGroup(name, rows) {
    var wrap = el('section', 'result-group');
    var head = el('h3', 'rg-title', name);
    var last = rows[rows.length - 1];
    var extra = '';
    if (last && /（(.+)）/.test(last['結果'] || '')) extra = /（(.+)）/.exec(last['結果'])[1];
    if (extra) { head.appendChild(document.createTextNode(' ')); head.appendChild(el('span', 'rg-badge', extra)); }
    wrap.appendChild(head);
    var ol = el('ol', 'rounds');
    rows.forEach(function (r) {
      var res = (r['結果'] || '').replace(/（.*）/, '');
      var li = el('li', 'round');
      li.appendChild(el('span', 'r-round', r['回戦']));
      li.appendChild(el('span', 'r-vs', 'vs ' + r['対戦相手']));
      var sc = el('span', 'r-score'); var pm = /^(.+?)\s*[（(]\s*(PK[^）)]*?)\s*[）)]\s*$/.exec(r['スコア'] || ''); sc.appendChild(document.createTextNode(pm ? pm[1] : r['スコア'])); if (pm) sc.appendChild(el('small', null, pm[2])); li.appendChild(sc);
      li.appendChild(el('span', 'r-res' + (/^勝/.test(res) ? ' win' : (/優勝/.test(res) ? ' final' : '')), res));
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    return wrap;
  }
  function initResults() {
    var hosts = document.querySelectorAll('[data-results]');
    if (!hosts.length || !sheetUrl('results')) return;
    loadSheet('results').then(function (rows) {
      rows = rows.filter(function (r) { return r['大会名'] && r['対戦相手']; });
      if (!rows.length) return;
      var order = [], groups = {};
      rows.forEach(function (r) {
        if (!groups[r['大会名']]) { groups[r['大会名']] = []; order.push(r['大会名']); }
        groups[r['大会名']].push(r);
      });
      hosts.forEach(function (h) {
        h.textContent = '';
        order.forEach(function (n) { h.appendChild(resultGroup(n, groups[n])); });
      });
    }).catch(function () { /* HTMLのまま */ });
  }

  /* ---------- フォーム（欠席連絡・お問い合わせ） ---------- */
  function initForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var key = form.getAttribute('data-form');
      var c = (CFG.forms || {})[key] || {};
      /* 欠席連絡のURLは config.js に置かず、保護者ページの鍵を通った人にだけ /parents/forms.json で渡す */
      if (key === 'absence' && !c.embedUrl && !c.viewUrl && !c.action) {
        fetch('/parents/forms.json', { credentials: 'same-origin', cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : {}; })
          .then(function (j) { if (j && j.absence && form.isConnected) setupForm(form, key, j.absence); })
          .catch(function () { /* 準備中のまま */ });
        return;
      }
      setupForm(form, key, c);
    });
    setDefaults();
  }
  function setupForm(form, key, c) {
    (function () {
      var note = form.querySelector('.form-note');
      var btn = form.querySelector('button[type="submit"]');
      var label = key === 'absence' ? '欠席・遅刻連絡フォームを開く' : 'お問い合わせフォームを開く';

      /* ① embedUrl があるとき：サイトの中にGoogleフォームを出す（自前の入力欄は隠す） */
      if (isGoogleFormUrl(c.embedUrl)) {
        var emb = el('div', 'form-embed');
        var frame = el('iframe', 'form-frame');
        frame.src = formEmbedSrc(c.embedUrl);
        frame.title = key === 'absence' ? '欠席・遅刻連絡フォーム（Googleフォーム）' : 'お問い合わせフォーム（Googleフォーム）';
        frame.loading = 'lazy';
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('frameborder', '0');
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        emb.appendChild(frame);
        var fallback = el('p', 'form-embed-note', 'うまく表示されないときは、');
        var fa = el('a', 'text-link', 'こちらから開けます');
        fa.href = isGoogleFormUrl(c.viewUrl, true) ? c.viewUrl : formViewSrc(c.embedUrl);
        fa.target = '_blank'; fa.rel = 'noopener';
        fallback.appendChild(fa);
        fallback.appendChild(document.createTextNode('。'));
        emb.appendChild(fallback);
        form.replaceWith(emb);
        return;
      }
      /* ② embedUrl が無く viewUrl があるとき：フォームを開くボタン */
      if (isGoogleFormUrl(c.viewUrl, true)) {
        var box = el('div', 'form-open');
        box.appendChild(el('p', null, key === 'absence'
          ? '欠席・遅刻のご連絡は、こちらのフォームから送れます。'
          : '体験のお申し込み・練習試合のお誘いなど、こちらのフォームからお送りください。'));
        var a = el('a', 'btn btn-navy', label);
        a.href = c.viewUrl; a.target = '_blank'; a.rel = 'noopener';
        box.appendChild(a);
        form.replaceWith(box);
        return;
      }
      if (isHttps(c.action)) {
        if (note) note.hidden = true;
        if (btn) btn.disabled = false;
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!form.checkValidity()) { form.reportValidity(); return; }
          var fd = new FormData();
          var f = c.fields || {};
          Object.keys(f).forEach(function (k) {
            var input = form.elements[k];
            if (f[k] && input) fd.append(f[k], input.value);
          });
          if (btn) btn.disabled = true;
          fetch(c.action, { method: 'POST', mode: 'no-cors', body: fd }).then(function () {
            var done = el('p', 'form-done', '送信しました。ありがとうございます。');
            form.appendChild(done);
            form.reset();
            setDefaults();
          }).catch(function () {
            var err = el('p', 'form-error', '送信できませんでした。時間をおいて、もう一度お試しください。');
            form.appendChild(err);
          }).then(function () { if (btn) btn.disabled = false; });
        });
      }
      /* どちらも空：準備中のまま（送信ボタンは無効） */
    })();
  }
  function setDefaults() {
    var d = document.getElementById('abs-date');
    if (d && !d.value) {
      var now = new Date();
      d.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    }
  }

  /* ---------- 体験練習会の日程（content/trial.js が正本） ----------
   * HTMLに手で書いた日付を、trial.js の表から描き直す。表が空・読めないときは、HTMLのまま。
   * 過去の日は出さない。全部過去なら「次回は決まりしだいお知らせします」にして、12月のチラシも隠す。 */
  var TRIAL_NONE = '次回の体験練習会は、決まりしだいお知らせします。';
  function trialToday() {
    var o = new Date(Date.now() + 9 * 3600 * 1000);   // 日本時間
    var q = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(location.search);   // 確認用：?today=2026-12-14
    var p = q ? parseYMD(q[1]) : null;
    return p ? p.y * 10000 + p.m * 100 + p.d : o.getUTCFullYear() * 10000 + (o.getUTCMonth() + 1) * 100 + o.getUTCDate();
  }
  /* trial.js の日付を読む：全角の数字・ハイフンの仲間（－ー‐‑–—−）を半角にそろえ、ありえない日付（13月・32日・2月30日など）は null にする */
  function half(s) {
    return String(s == null ? '' : s)
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[－ー‐‑–—−]/g, '-').replace(/：/g, ':').replace(/[\s　]+/g, '');
  }
  function trialDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(half(s));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y: y, m: mo, d: d } : null;
  }
  function initTrial() {
    var lists = document.querySelectorAll('[data-trial-list]');
    if (!lists.length) return;
    var src = window.TRIAL_SESSIONS;
    if (!Array.isArray(src)) return;
    var all = src.map(function (s) {
      var p = s && typeof s.date === 'string' ? trialDate(s.date) : null;
      return p ? { p: p, n: p.y * 10000 + p.m * 100 + p.d, start: half(s.start), end: half(s.end), venue: String(s.venue || '') } : null;
    }).filter(Boolean);
    if (!all.length) return;   // 空・読めない行だけ → HTMLのまま
    var now = trialToday();
    var up = all.filter(function (s) { return s.n >= now; }).sort(function (a, b) { return a.n - b.n; });
    lists.forEach(function (ul) {
      var withTitle = ul.getAttribute('data-trial-list') === 'top';   // トップは「体験練習会 13:00〜15:00」、入部案内は時間だけ
      var grid = ul.closest('.join-grid');
      var flyer = grid && grid.querySelector('[data-trial-flyer]');
      var head = document.querySelector('[data-trial-title]');
      if (!up.length) {
        var note = el('p', 'note', TRIAL_NONE); note.setAttribute('data-trial-none', '');
        ul.replaceWith(note);
        if (flyer) flyer.hidden = true;
        if (grid) grid.classList.add('no-flyer');
        if (head) head.textContent = '体験練習会';
        return;
      }
      ul.textContent = '';
      up.forEach(function (s) {
        var li = el('li');
        var dd = el('span', 'dd', s.p.m + '/' + s.p.d); dd.appendChild(el('small', null, '（' + weekdayOf(s.p) + '）'));
        var time = s.start ? s.start + (s.end ? '〜' + s.end : '〜') : '';
        var dw = el('span', 'dw', [withTitle ? '体験練習会' : '', time].filter(Boolean).join(' '));
        if (s.venue) dw.appendChild(el('span', null, s.venue));
        li.appendChild(dd); li.appendChild(dw); ul.appendChild(li);
      });
      if (head) {
        var months = {}; up.forEach(function (s) { months[s.p.m] = 1; });
        var ms = Object.keys(months);
        head.textContent = ms.length === 1 ? ms[0] + '月の体験練習会' : '体験練習会の日程';
      }
    });
  }

  /* ---------- 計測（Googleタグマネージャー） ----------
   * config.js の analytics.gtmId が「GTM-英数字」のときだけ読み込む。空なら何も読まない。
   * 読み込みはこの1つの関数にまとめてある。同意バナーを付けるときは、この関数を
   * 「同意が取れたあと」に呼ぶ形に変えるだけでよい（boot からの呼び出しを外して、同意の処理から呼ぶ）。 */
  var analyticsStarted = false;
  function startAnalytics() {
    var id = (CFG.analytics || {}).gtmId;
    if (analyticsStarted || typeof id !== 'string' || !/^GTM-[A-Z0-9]+$/.test(id)) return;
    analyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  /* ---------- 起動 ---------- */
  function boot() {
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');
    initMenu(); initLightbox(); initNews(); initResults(); initForms(); initTrial();
    startAnalytics();
    document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
    document.querySelectorAll('[data-social]').forEach(function (a) {
      var k = a.getAttribute('data-social');
      var v = (CFG.social || {})[k];
      var ok = k === 'line' ? isLineUrl(v) : isHttps(v);   // LINE は lin.ee / line.me だけ
      if (ok) {
        a.href = v; a.hidden = false;
        var b = a.closest('[data-social-box]'); if (b) b.hidden = false;
      }
    });
    document.querySelectorAll('[data-drive]').forEach(function (a) {
      if (isHttps((CFG.drive || {}).folderUrl)) { a.href = CFG.drive.folderUrl; a.hidden = false; var b = a.closest('[data-drive-box]'); if (b) b.hidden = false; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
