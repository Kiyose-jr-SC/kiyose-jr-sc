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
    if (direct) return isHttps(direct) ? direct : '';
    if (s.useSharedLinkInstead && s.spreadsheetId) {
      var tab = kind === 'news' ? s.tabNews : s.tabResults;
      return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(s.spreadsheetId) +
        '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tab);
    }
    return '';
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
      var note = form.querySelector('.form-note');
      var btn = form.querySelector('button[type="submit"]');
      var label = key === 'absence' ? '欠席・遅刻連絡フォームを開く' : 'お問い合わせフォームを開く';

      if (isHttps(c.viewUrl)) {
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
    });
    setDefaults();
  }
  function setDefaults() {
    var d = document.getElementById('abs-date');
    if (d && !d.value) {
      var now = new Date();
      d.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    }
  }

  /* ---------- 起動 ---------- */
  function boot() {
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');
    initMenu(); initLightbox(); initNews(); initResults(); initForms();
    document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
    document.querySelectorAll('[data-social]').forEach(function (a) {
      var v = (CFG.social || {})[a.getAttribute('data-social')];
      if (isHttps(v)) { a.href = v; a.hidden = false; }
    });
    document.querySelectorAll('[data-drive]').forEach(function (a) {
      if (isHttps((CFG.drive || {}).folderUrl)) { a.href = CFG.drive.folderUrl; a.hidden = false; var b = a.closest('[data-drive-box]'); if (b) b.hidden = false; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
