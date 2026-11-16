/*
 * 清瀬ジュニアサッカークラブ サイト設定ファイル
 * ------------------------------------------------------------
 * URL や ID は、ぜんぶここに集めています。
 * 空欄（''）のところは「まだ決まっていない」という意味で、
 * 空のままでもサイトは壊れません（HTMLに書いてある内容が出ます）。
 * 入れると、その場所が動き出します。
 *
 * 書き換えるときは、'' の中だけを変えてください。
 * 引用符（'）やカンマ（,）は消さないでください。
 */
window.SITE_CONFIG = {

  /* ---------- SNS ---------- */
  social: {
    instagram: 'https://www.instagram.com/kiyose.jr/',
    instagramHandle: '@KIYOSE.JR',
    // Facebook のページURLを入れると、フッターと「お問い合わせ・リンク」に出ます。
    // 例）'https://www.facebook.com/○○○○'
    facebook: ''
  },

  /* ---------- お知らせ・試合結果（Googleスプレッドシート） ----------
   * シート：清瀬ジュニアSC サイト更新用シート
   *
   * 【動かし方】スプレッドシートの
   *   「ファイル → 共有 → ウェブに公開」を開き、
   *   ① 「お知らせ」タブを選び、形式を「カンマ区切り値(.csv)」にして公開 → できたURLを newsCsvUrl に貼る
   *   ② 「試合結果」タブも同じようにして、できたURLを resultsCsvUrl に貼る
   *
   * 空のままのときは、HTMLに書いてある最新の内容が表示されます。
   */
  sheets: {
    spreadsheetId: '1PJjT4XZpFbunYotZt-mq1Nk3l1Rp2EFURY3lPRTp5ww', // 控え（シートの場所）
    newsCsvUrl: '',     // 例）https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv
    resultsCsvUrl: '',  // 例）https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123&single=true&output=csv
    // 上の2つが空で、シートの共有が「リンクを知っている全員が閲覧可」のときだけ使える別の方法。
    // true にすると、タブ名からURLを自動で作ります（ウェブに公開は不要）。
    useSharedLinkInstead: false,
    tabNews: 'お知らせ',
    tabResults: '試合結果'
    // お知らせタブの列：日付｜カテゴリ｜タイトル｜詳細｜掲載状態（「公開中」の行だけ表示）
    // 試合結果タブの列：大会名｜回戦｜対戦相手｜スコア｜結果｜出典URL
  },

  /* ---------- 活動予定（Googleカレンダー） ----------
   * チーム共用アカウントで、公開カレンダーを作ります。
   * calendarId : カレンダーの設定 → 「カレンダーの統合」にある「カレンダーID」
   * apiKey     : Google Cloud で発行した「Calendar API」のキー（ウェブサイトの制限つき）
   * 2つとも入れると、カレンダーの予定が表示されます。
   * 空のままのときは、content/events.js に書いた予定が表示されます。
   *
   * 予定のタイトルに「⑤⑥」「4年」「幼」などを入れておくと、学年の絞り込みに出ます。
   * 入れていない予定は、どの学年を選んでも出ます。
   */
  calendar: {
    calendarId: '',
    apiKey: ''
  },

  /* ---------- 資料（Googleドライブ） ----------
   * 共有フォルダ（閲覧のみ）のURLを入れると、「資料フォルダを開く」ボタンが出ます。
   */
  drive: {
    folderUrl: ''
  },

  /* ---------- 欠席・遅刻連絡 / お問い合わせ（Googleフォーム） ----------
   * どちらも、次の2つのやり方があります。やさしいのは【やり方A】です。
   *
   * 【やり方A】Googleフォームの「送信 → リンク」のURLを viewUrl に貼る。
   *            → サイトに「フォームを開く」ボタンが出ます。
   * 【やり方B】サイトのデザインのまま送りたいとき。
   *            action に「…/formResponse」で終わるURL、
   *            fields に各質問の「entry.数字」を入れる（作った人に聞いてください）。
   *            ※ 対象日の質問は、フォーム側を「記述式」にしてください。
   *
   * どちらも空のときは、「準備中です」と表示され、送信できません。
   */
  forms: {
    absence: {
      viewUrl: '',
      action: '',
      fields: { grade: '', name: '', date: '', type: '', note: '' }
    },
    contact: {
      viewUrl: '',
      action: '',
      fields: { name: '', email: '', subject: '', body: '' }
    }
  }
};
