/*
 * Googleカレンダーの予定を、サイトの活動予定の形にそろえる部品
 * ------------------------------------------------------------
 * コーチが Googleカレンダーに、いつもの書き方（終日の予定・タイトルに全部）で
 * 入れた予定から、学年の印・時間・会場を読み取ります。
 *   例）「⑤⑥練習 清明小13〜16」→ 学年⑤⑥／練習／清明小学校／13:00〜16:00
 * 読み取れないところは、そのままタイトルに残します（壊れません）。
 *
 * 会場の略称（八小・内山A など）は ../config.js の calendar.venues にあります。
 * 画面の組み立ては schedule.js です。
 */
(function (root) {
  'use strict';

  var MARKS = '幼①②③④⑤⑥';                         // 学年の印（schedule.js の gradesFrom と同じもの）
  var TIME = '\\d{1,2}(?::\\d{2}|時\\d{1,2}分?|時半|半|時)?';   // 13 / 13:30 / 13時 / 13時30分 / 7半 / 12時半

  var HOUR_MIN = 6, HOUR_MAX = 23;                      // タイトルから時間として読む範囲（6時〜23時台）
  var NOT_TIME_AFTER = /^\s*[回節位年組番戦本点人日月]/;  // 「1-2回戦」「3-4位」の数字は時間ではない

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function cal() { return (root.SITE_CONFIG && root.SITE_CONFIG.calendar) || {}; }

  /* 全角の数字・英字・記号を半角に、いろいろな「〜」「-」をそろえる（①〜⑥は触らない） */
  function tidy(s) {
    return String(s == null ? '' : s)
      .replace(/[０-９Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[：:]/g, ':')
      .replace(/[～~〜]/g, '〜')
      .replace(/[－‐‑–—−]/g, '-')
      .replace(/[　 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hm(token) {
    var m = /^(\d{1,2})(?::(\d{2})|時(\d{1,2})分?|時半|半|時)?$/.exec(token);
    if (!m) return null;
    var h = +m[1], mi = m[2] != null ? +m[2] : (m[3] != null ? +m[3] : (/半/.test(token) ? 30 : 0));
    if (h < HOUR_MIN || h > HOUR_MAX || mi > 59) return null;   // 練習のある時間帯だけ。「1-2回戦」「第1-2節」を時間と読まない
    return { h: h, mi: mi, text: pad(h) + ':' + pad(mi) };
  }

  /* 文の中の「13〜15」「12:30〜17」「7半〜14」「18-21」「13時から」を探す（いちばん後ろのもの） */
  function findTime(s) {
    var best = null, m;
    var range = new RegExp('(^|[^\\d:第])(' + TIME + ')\\s*[〜\\-]\\s*(' + TIME + ')', 'g');
    while ((m = range.exec(s))) {
      var a = hm(m[2]), b = hm(m[3]);
      if (a && b && (b.h * 60 + b.mi) > (a.h * 60 + a.mi) && !NOT_TIME_AFTER.test(s.slice(m.index + m[0].length))) {
        best = { start: a.text, end: b.text, from: m.index + m[1].length, to: m.index + m[0].length };
      }
      range.lastIndex = m.index + m[1].length + 1;
    }
    if (best) return best;
    var open = new RegExp('(^|[^\\d:第])(' + TIME + ')\\s*(?:〜|から)\\s*$');
    m = open.exec(s);
    if (m && hm(m[2])) return { start: hm(m[2]).text, end: '', from: m.index + m[1].length, to: m.index + m[0].length };
    return null;
  }

  /* 会場の略称を探す（長い名前から先に） */
  function findVenue(s) {
    var table = cal().venues || {}, names = {}, k;
    for (k in table) if (Object.prototype.hasOwnProperty.call(table, k)) { names[k] = table[k]; names[table[k]] = table[k]; }
    var keys = Object.keys(names).sort(function (a, b) { return b.length - a.length; });
    var low = s.toLowerCase();
    for (var i = 0; i < keys.length; i++) {
      var at = keys[i] ? low.indexOf(keys[i].toLowerCase()) : -1;
      if (at >= 0) return { venue: names[keys[i]], from: at, to: at + keys[i].length };
    }
    return null;
  }

  /*
   * タイトル1行を読み解く。
   *   opt.venue === false … 会場は読まない（Googleの「場所」が入っているとき）
   * 返すもの：{ who, start, end, venue, title, read }   read=false なら何も読めなかった（titleは元のまま）
   */
  function parseTitle(summary, opt) {
    opt = opt || {};
    var original = String(summary == null ? '' : summary).replace(/\s+/g, ' ').trim();
    var s = tidy(summary), out = { who: '', start: '', end: '', venue: '', title: original, read: false };
    var m = new RegExp('^[' + MARKS + '](?:\\s*[' + MARKS + '])*').exec(s);
    if (m) { out.who = m[0].replace(/\s+/g, ''); s = s.slice(m[0].length).trim(); }
    var t = findTime(s);
    if (t) { out.start = t.start; out.end = t.end; s = (s.slice(0, t.from) + ' ' + s.slice(t.to)).replace(/\s+/g, ' ').trim(); }
    if (opt.venue !== false) {
      var v = findVenue(s);
      if (v) { out.venue = v.venue; s = (s.slice(0, v.from) + ' ' + s.slice(v.to)).replace(/\s+/g, ' ').trim(); }
    }
    if (!out.who && !out.start && !out.venue) { out.title = stripClub(original); return out; }   // 何も読めない → タイトルのまま
    s = s.replace(/^[\s・,、/／-]+|[\s・,、/／-]+$/g, '');
    out.title = stripClub(s) || cal().defaultTitle || '練習';   // 種目が書かれていない予定（例「⑤⑥ 清明小 13〜16」）は「練習」
    out.read = true;
    return out;
  }
  /* 「清瀬ジュニアSC蹴り納め」の頭の「清瀬ジュニアSC」は、このサイトの中では要らない（残りがあるときだけ外す） */
  function stripClub(t) {
    var list = cal().stripFromTitle || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && t.indexOf(list[i]) === 0 && t.length > list[i].length) return t.slice(list[i].length).replace(/^[\s・-]+/, '');
    }
    return t;
  }
  /* 終日でタイトルに時間がないとき、説明の「日時：…13:00〜17:00」の行から時間を拾う */
  function timeFromDetail(detail) {
    var lines = String(detail || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = /^[【\[]?(?:開催)?日時[】\]]?\s*[:：]?(.*)$/.exec(tidy(lines[i]));
      if (m) { var t = findTime(m[1]); if (t) return t; }
    }
    return null;
  }

  /* ---------- リンク ---------- */
  /* Googleカレンダーが説明のリンクを包む形（google.com/url?q=…）を元のURLに戻す。https のURLだけ返し、それ以外は '' */
  function safeHref(u) {
    var p;
    try { p = new URL(u); } catch (e) { return ''; }
    if ((p.hostname === 'www.google.com' || p.hostname === 'google.com') && p.pathname === '/url') {
      var inner = p.searchParams.get('q') || p.searchParams.get('url') || '';
      try { p = new URL(inner); } catch (e) { return ''; }
    }
    return p.protocol === 'https:' && p.hostname ? p.href : '';
  }
  /* 文を「ふつうの文字」と「https のリンク」に分ける。返すもの：[{ text }, { text, href }, …]（http: や javascript: はリンクにしない） */
  function splitLinks(text) {
    var out = [], last = 0, m, re = /https:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/gi;
    text = String(text == null ? '' : text);
    while ((m = re.exec(text))) {
      var raw = m[0].replace(/[.,;:!?'")\]]+$/, '');          // 文末の「。」「)」などは、リンクに含めない
      var href = safeHref(raw);
      if (!href) continue;
      if (m.index > last) out.push({ text: text.slice(last, m.index) });
      out.push({ text: href, href: href });
      last = m.index + raw.length;
      re.lastIndex = last;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out;
  }

  /* ---------- 説明（HTML）→ ふつうの文字 ---------- */
  var BLOCK = /^(P|DIV|H[1-6]|UL|OL|LI|TR|TABLE|BLOCKQUOTE|PRE)$/;
  function htmlToText(html) {
    if (html == null || html === '') return '';
    var src = String(html), NL = '', tagged = /<\/?[a-z][^>]*>/i.test(src);
    if (!tagged) src = src.replace(/\r?\n/g, NL);               // タグのない説明は、改行をそのまま生かす
    var body;
    try { body = new DOMParser().parseFromString(src, 'text/html').body; } catch (e) { body = null; }
    var out = [];
    function endsLine() { return !out.length || /\n$/.test(out[out.length - 1]); }
    function walk(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          var tx = tagged ? n.data.replace(/[\t\r\n ]+/g, ' ') : n.data;
          if (tagged && tx === ' ' && endsLine()) continue;      // タグのあいだの改行・空白は読み飛ばす
          out.push(tx); continue;
        }
        if (n.nodeType !== 1) continue;
        var tag = n.tagName;
        if (tag === 'BR') { out.push('\n'); continue; }
        if (tag === 'SCRIPT' || tag === 'STYLE') continue;
        var block = BLOCK.test(tag);
        if (block && !endsLine()) out.push('\n');
        if (tag === 'LI') out.push('・');
        walk(n);
        if (tag === 'A') {
          var href = safeHref(n.getAttribute('href') || '');       // Googleの包みは外す。https 以外は出さない
          if (href && n.textContent.indexOf(href) < 0 && n.textContent.indexOf(href.replace(/\/$/, '')) < 0) out.push('（' + href + '）');   // 文字と行き先がちがうときは、行き先も残す
        }
        if (block) out.push('\n');
      }
    }
    if (body) walk(body);
    else out.push(src.replace(/<[^>]*>/g, ''));
    var lines = out.join('').split(NL).join('\n').replace(/ /g, ' ').split('\n').map(function (l) {
      return l.replace(/^[ 　]+|[ 　]+$/g, '').replace(/^・\s*・/, '・');   // 自分で「・」を打った行は、重ねない
    }).filter(function (l, i, a) { return l !== '・' && !(l === '' && (i === 0 || a[i - 1] === '')); });
    // 「・」だけの行を消したあとにできる、続いた空行をつめる
    var res = [];
    lines.forEach(function (l) { if (!(l === '' && (!res.length || res[res.length - 1] === ''))) res.push(l); });
    while (res.length && res[res.length - 1] === '') res.pop();
    return res.join('\n');
  }

  /* ---------- Google Calendar API の events.list の items → サイトの予定の形 ---------- */
  function jstParts(iso) {
    var d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
    return { date: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()), time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) };
  }
  function fromGoogle(items) {
    return items.filter(function (it) { return it.status !== 'cancelled' && it.start; }).map(function (it) {
      var s = it.start, e = it.end || {}, loc = (it.location || '').trim();
      var p = parseTitle(it.summary, { venue: !loc });
      var out = { title: p.title, who: p.who, venue: loc || p.venue, detail: htmlToText(it.description) };
      if (s.dateTime) {                                          // 時刻が入っている予定は、その時刻を正とする
        var a = jstParts(s.dateTime), b = e.dateTime ? jstParts(e.dateTime) : null;
        out.date = a.date; out.start = a.time; out.end = b && b.date === a.date ? b.time : '';
      } else {                                                   // 終日の予定は、タイトルの時間を読む
        var d = p.start ? p : timeFromDetail(out.detail);
        out.date = s.date; out.start = d ? d.start : ''; out.end = d ? d.end : '';
      }
      return out;
    });
  }

  root.ScheduleParse = { fromGoogle: fromGoogle, parseTitle: parseTitle, htmlToText: htmlToText, splitLinks: splitLinks };
})(window);
