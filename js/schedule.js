/*
 * 活動予定（リスト表示・月カレンダー・学年の絞り込み・自分のカレンダーに追加）
 * 設定は ../config.js、Googleカレンダーがつながる前の控えは ../content/events.js にあります。
 * Googleカレンダーの予定の読み解き（学年の印・時間・会場・説明）は schedule-parse.js です。
 */
(function () {
  'use strict';
  var host = document.getElementById('schedule-app');
  if (!host) return;

  var U = window.SiteUtil, el = U.el, pad = U.pad;
  var CFG = window.SITE_CONFIG || {};
  var CAL = CFG.calendar || {};
  var GRADES = [['all', 'すべて'], ['low', '幼・1〜3年'], ['mid', '4年'], ['high', '5・6年']];

  /* ---------- 今日（日本時間）。?today=2026-11-16 で確認用に変えられます ---------- */
  function jstNow() {
    var o = new Date(Date.now() + 9 * 3600 * 1000);
    return { y: o.getUTCFullYear(), m: o.getUTCMonth() + 1, d: o.getUTCDate() };
  }
  var today = jstNow();
  var q = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(location.search);
  if (q) { var tp = U.parseYMD(q[1]); if (tp) today = tp; }
  function key(p) { return p.y + '-' + pad(p.m) + '-' + pad(p.d); }
  var todayKey = key(today);

  var DAYS_FIRST = 8;
  var state = { events: [], fromCalendar: false, view: 'list', grade: 'all', showPast: false, showAll: false, month: { y: today.y, m: today.m } };

  /* ---------- 予定のそろえ方 ---------- */
  function gradesFrom(text) {
    var g = [];
    if (/[幼①②③]|[1-3１-３]年|低学年/.test(text)) g.push('low');
    if (/④|[4４]年/.test(text)) g.push('mid');
    if (/[⑤⑥]|[56５６]年|高学年/.test(text)) g.push('high');
    return g;
  }
  function normalize(list) {
    return list.map(function (e, i) {
      return {
        id: 'e' + i, date: e.date, start: e.start || '', end: e.end || '',
        who: e.who || '', title: e.title || '', venue: e.venue || '', detail: e.detail || '',
        grades: gradesFrom((e.who || '') + ' ' + (e.title || ''))
      };
    }).filter(function (e) { return U.parseYMD(e.date); })
      .sort(function (a, b) { return (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99')); });
  }
  var fromGoogle = (window.ScheduleParse || {}).fromGoogle;   // Googleカレンダーの読み解きは js/schedule-parse.js

  /* ---------- 見た目の部品 ---------- */
  function dayLabel(dateStr) {
    var p = U.parseYMD(dateStr);
    return { md: p.m + '.' + p.d, w: U.weekdayOf(p) };
  }
  function timeText(e) {
    if (!e.start) return '終日';
    return e.start + (e.end ? '〜' + e.end : '〜');
  }
  function visible() {
    return state.events.filter(function (e) {
      return state.grade === 'all' || !e.grades.length || e.grades.indexOf(state.grade) >= 0;
    });
  }

  /* ---------- 「自分のカレンダーに追加」 ---------- */
  function utcStamp(dateStr, hhmm) {
    var p = U.parseYMD(dateStr), t = hhmm.split(':');
    var d = new Date(Date.UTC(p.y, p.m - 1, p.d, +t[0] - 9, +t[1]));
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  function nextDay(dateStr) {
    var p = U.parseYMD(dateStr), d = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }
  function ymd8(dateStr) { return dateStr.replace(/-/g, ''); }
  function eventName(e) { return '清瀬ジュニアSC ' + (e.who ? e.who + ' ' : '') + e.title; }
  function dates(e) {
    if (!e.start) return ymd8(e.date) + '/' + nextDay(e.date);
    return utcStamp(e.date, e.start) + '/' + utcStamp(e.date, e.end || e.start);
  }
  function googleUrl(e) {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(eventName(e)) + '&dates=' + dates(e) +
      '&location=' + encodeURIComponent(e.venue) + '&details=' + encodeURIComponent(e.detail);
  }
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsFile(e) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var d = dates(e).split('/');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KIYOSE JUNIOR SC//JA', 'BEGIN:VEVENT',
      'UID:' + ymd8(e.date) + '-' + e.id + '@kiyose-jr-sc', 'DTSTAMP:' + stamp];
    if (!e.start) { lines.push('DTSTART;VALUE=DATE:' + d[0], 'DTEND;VALUE=DATE:' + d[1]); }
    else { lines.push('DTSTART:' + d[0], 'DTEND:' + d[1]); }
    lines.push('SUMMARY:' + esc(eventName(e)));
    if (e.venue) lines.push('LOCATION:' + esc(e.venue));
    if (e.detail) lines.push('DESCRIPTION:' + esc(e.detail));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadIcs(e) {
    var blob = new Blob([icsFile(e)], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kiyose-jr-sc-' + ymd8(e.date) + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- 予定の詳細ダイアログ ---------- */
  function eventBlock(e) {
    var box = el('section', 'ev-detail');
    var dl = dayLabel(e.date);
    var head = el('p', 'ev-when');
    head.appendChild(el('span', 'ev-md', dl.md));
    head.appendChild(el('span', 'ev-w', '（' + dl.w + '）'));
    head.appendChild(el('span', 'ev-time', timeText(e)));
    box.appendChild(head);
    var h = el('h3', 'ev-title');
    if (e.who) h.appendChild(el('span', 'who', e.who));
    h.appendChild(document.createTextNode(e.title));
    box.appendChild(h);
    if (e.venue) {
      var v = el('p', 'ev-venue', '場所：' + e.venue);
      box.appendChild(v);
    }
    if (e.detail) box.appendChild(el('p', 'ev-text', e.detail));
    var acts = el('div', 'ev-actions');
    var g = el('a', 'btn btn-navy btn-sm', 'Googleカレンダーに追加');
    g.href = googleUrl(e); g.target = '_blank'; g.rel = 'noopener';
    var i = el('button', 'btn btn-line btn-sm', 'iPhone・Outlook用に保存（.ics）');
    i.type = 'button'; i.addEventListener('click', function () { downloadIcs(e); });
    acts.appendChild(g); acts.appendChild(i);
    box.appendChild(acts);
    return box;
  }
  function openEvents(list, title) {
    var wrap = el('div', 'ev-list');
    list.forEach(function (e) { wrap.appendChild(eventBlock(e)); });
    SiteDialog.open(title, wrap);
  }

  /* ---------- リスト表示 ---------- */
  function renderList(out) {
    var evs = visible().filter(function (e) { return state.showPast || e.date >= todayKey; });
    if (!evs.length) {
      out.appendChild(el('p', 'empty', state.showPast ? '該当する予定はありません。' : 'これからの予定は、まだ入っていません。'));
      return;
    }
    var byDay = {}, days = [];
    evs.forEach(function (e) { if (!byDay[e.date]) { byDay[e.date] = []; days.push(e.date); } byDay[e.date].push(e); });
    var hiddenDays = 0;
    if (!state.showAll && days.length > DAYS_FIRST) { hiddenDays = days.length - DAYS_FIRST; days = days.slice(0, DAYS_FIRST); }
    days.forEach(function (d) {
      var dl = dayLabel(d);
      var sec = el('section', 'day' + (d < todayKey ? ' past' : '') + (d === todayKey ? ' is-today' : ''));
      var h = el('h3', 'day-h');
      h.appendChild(el('span', 'day-md', dl.md));
      h.appendChild(el('span', 'day-w', dl.w));
      if (d === todayKey) h.appendChild(el('span', 'day-today', '今日'));
      sec.appendChild(h);
      var ul = el('ul', 'day-list');
      byDay[d].forEach(function (e) {
        var li = el('li');
        var b = el('button', 'ev'); b.type = 'button';
        b.appendChild(el('span', 'ev-t', timeText(e)));
        var main = el('span', 'ev-main');
        var t = el('span', 'ev-name');
        if (e.who) t.appendChild(el('span', 'who', e.who));
        t.appendChild(document.createTextNode(e.title));
        main.appendChild(t);
        if (e.venue) main.appendChild(el('span', 'ev-v', e.venue));
        b.appendChild(main);
        b.appendChild(el('span', 'ev-more', '詳細・追加'));
        b.addEventListener('click', function () { openEvents([e], dl.md.replace('.', '月') + '日（' + dl.w + '）の予定'); });
        li.appendChild(b); ul.appendChild(li);
      });
      sec.appendChild(ul); out.appendChild(sec);
    });
    if (hiddenDays) {
      var more = el('button', 'btn btn-line more-days', 'このあとの予定をもっと見る（あと' + hiddenDays + '日分）'); more.type = 'button';
      more.addEventListener('click', function () { state.showAll = true; render(); });
      out.appendChild(more);
    }
  }

  /* ---------- 月カレンダー ---------- */
  function renderCal(out) {
    var mo = state.month;
    var nav = el('div', 'cal-nav');
    var prev = el('button', 'cal-step', '‹ 前の月'); prev.type = 'button';
    var next = el('button', 'cal-step', '次の月 ›'); next.type = 'button';
    prev.addEventListener('click', function () { shiftMonth(-1); });
    next.addEventListener('click', function () { shiftMonth(1); });
    nav.appendChild(prev);
    nav.appendChild(el('p', 'cal-title', mo.y + '年' + mo.m + '月'));
    nav.appendChild(next);
    out.appendChild(nav);

    var grid = el('div', 'cal-grid');
    U.WEEK.slice(1).concat(U.WEEK[0]).forEach(function (w, i) {
      grid.appendChild(el('div', 'cal-w' + (i === 5 ? ' sat' : '') + (i === 6 ? ' sun' : ''), w));
    });
    var first = new Date(Date.UTC(mo.y, mo.m - 1, 1)).getUTCDay();   // 0=日
    var offset = (first + 6) % 7;                                      // 月曜はじまり
    var last = new Date(Date.UTC(mo.y, mo.m, 0)).getUTCDate();
    var i, evs = visible();
    for (i = 0; i < offset; i++) grid.appendChild(el('div', 'cal-c blank'));
    for (var d = 1; d <= last; d++) {
      var ds = mo.y + '-' + pad(mo.m) + '-' + pad(d);
      var list = evs.filter(function (e) { return e.date === ds; });
      var cls = 'cal-c' + (ds < todayKey ? ' past' : '') + (ds === todayKey ? ' is-today' : '');
      var cell = list.length ? el('button', cls + ' has-ev') : el('div', cls);
      if (list.length) cell.type = 'button';
      cell.appendChild(el('span', 'cal-d', String(d)));
      if (list.length) {
        var dots = el('span', 'cal-dots');
        list.slice(0, 4).forEach(function () { dots.appendChild(el('i')); });
        cell.appendChild(dots);
        list.slice(0, 3).forEach(function (e) { cell.appendChild(el('span', 'cal-ev', (e.who ? e.who + ' ' : '') + e.title)); });
        if (list.length > 3) cell.appendChild(el('span', 'cal-more', '他' + (list.length - 3) + '件'));
        (function (l, dd) {
          cell.addEventListener('click', function () {
            var dl = dayLabel(dd);
            openEvents(l, dl.md.replace('.', '月') + '日（' + dl.w + '）の予定');
          });
        })(list, ds);
        cell.setAttribute('aria-label', mo.m + '月' + d + '日 ' + list.length + '件の予定');
      }
      grid.appendChild(cell);
    }
    out.appendChild(grid);
  }
  function shiftMonth(n) {
    var m = state.month.m + n, y = state.month.y;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    state.month = { y: y, m: m };
    render();
  }

  /* ---------- 全体 ---------- */
  var ui = {};
  function buildFrame() {
    host.textContent = '';
    var bar = el('div', 'sch-bar');

    var chips = el('div', 'chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', '学年で絞り込み');
    chips.appendChild(el('span', 'chips-l', '学年'));
    GRADES.forEach(function (g) {
      var b = el('button', 'chip', g[1]); b.type = 'button'; b.dataset.grade = g[0];
      b.addEventListener('click', function () { state.grade = g[0]; render(); });
      chips.appendChild(b);
    });
    bar.appendChild(chips);

    var seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', '表示の切り替え');
    [['list', 'リスト表示'], ['cal', 'カレンダー表示']].forEach(function (v) {
      var b = el('button', 'seg-b', v[1]); b.type = 'button'; b.dataset.view = v[0];
      b.addEventListener('click', function () { state.view = v[0]; render(); });
      seg.appendChild(b);
    });
    bar.appendChild(seg);
    host.appendChild(bar);

    ui.body = el('div', 'sch-body'); host.appendChild(ui.body);

    var foot = el('div', 'sch-foot');
    ui.past = el('button', 'link-btn', '過去の予定も見る'); ui.past.type = 'button';
    ui.past.addEventListener('click', function () { state.showPast = !state.showPast; render(); });
    foot.appendChild(ui.past);
    var add = el('button', 'btn btn-yellow btn-sm', '自分のカレンダーに追加'); add.type = 'button';
    add.addEventListener('click', openSubscribe);
    foot.appendChild(add);
    host.appendChild(foot);
    ui.chips = chips; ui.seg = seg;
  }
  function render() {
    ui.chips.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.grade === state.grade ? 'true' : 'false'); });
    ui.seg.querySelectorAll('.seg-b').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === state.view ? 'true' : 'false'); });
    ui.past.hidden = state.view !== 'list';
    ui.past.setAttribute('aria-pressed', state.showPast ? 'true' : 'false');
    ui.past.textContent = state.showPast ? '過去の予定を隠す' : '過去の予定も見る';
    ui.body.textContent = '';
    ui.body.className = 'sch-body view-' + state.view;
    if (state.fromCalendar && !state.events.length) ui.body.appendChild(el('p', 'empty', 'この期間の予定はまだありません。'));
    else if (state.view === 'list') renderList(ui.body); else renderCal(ui.body);
  }
  function openSubscribe() {
    var box = el('div', 'sub-box');
    var id = CAL.calendarId;
    if (id) {
      box.appendChild(el('p', null, 'チームのカレンダーを一度だけ追加すると、練習や試合の予定がご自分のスマホに表示されます。予定が変わったときも、自動で直ります。'));
      var g = el('a', 'btn btn-navy', 'Googleカレンダーに追加（Android・Googleアプリ）');
      g.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(id); g.target = '_blank'; g.rel = 'noopener';
      var i = el('a', 'btn btn-line', 'iPhoneのカレンダーに追加（iCalendar）');
      i.href = 'webcal://calendar.google.com/calendar/ical/' + encodeURIComponent(id) + '/public/basic.ics';
      box.appendChild(g); box.appendChild(i);
    } else {
      box.appendChild(el('p', null, 'チームのカレンダーは、公開の準備中です。'));
      box.appendChild(el('p', null, 'それまでは、予定をタップして開く「Googleカレンダーに追加」または「iPhone・Outlook用に保存」から、1件ずつ追加できます。'));
    }
    SiteDialog.open('自分のカレンダーに追加', box);
  }

  function start(list, fromCalendar) {
    state.events = normalize(list);
    state.fromCalendar = !!fromCalendar;
    buildFrame();
    render();
  }
  function useFallback() { start(window.FALLBACK_EVENTS || [], false); }
  /* カレンダーを設定しているのに読めなかったとき：古い控えは出さず、お知らせして開き先を添える */
  function showLoadError() {
    host.textContent = '';
    var box = el('div', 'sch-error');
    box.setAttribute('role', 'alert');
    box.appendChild(el('p', 'empty', '予定を読み込めませんでした。少し時間をおいて開き直してください。'));
    var a = el('a', 'btn btn-navy', 'Googleカレンダーで開く');
    a.href = 'https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(CAL.calendarId);
    a.target = '_blank'; a.rel = 'noopener';
    box.appendChild(a);
    host.appendChild(box);
  }

  if (CAL.calendarId && CAL.apiKey) {
    var min = new Date(today.y, today.m - 2, 1).toISOString();
    var max = new Date(today.y, today.m + 6, 1).toISOString();
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(CAL.calendarId) +
      '/events?key=' + encodeURIComponent(CAL.apiKey) + '&singleEvents=true&orderBy=startTime&maxResults=500' +
      '&timeMin=' + encodeURIComponent(min) + '&timeMax=' + encodeURIComponent(max);
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    fetch(url, ctl ? { signal: ctl.signal } : {})
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { start(fromGoogle(j.items || []), true); })
      .catch(showLoadError);
  } else { useFallback(); }
})();
