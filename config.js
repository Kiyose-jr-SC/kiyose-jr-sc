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
    facebook: '',
    // LINE公式アカウントの「友だち追加」のURLを入れると、
    // 「LINEで相談・友だち追加」のボタンが出ます（お問い合わせページ、体験・入団案内、フッター）。
    // 空のままのときは、ボタンは出ません。
    // 取ってくる場所：LINE Official Account Manager → 「友だちを増やす」→「友だち追加ガイド」
    //   → 「URLを作成」で出る https://lin.ee/… のURL
    //   ※ https://lin.ee/ または https://line.me/ で始まるものだけが使えます。
    // いま入っているのは、コーチのLINEの友だち追加URLです。
    line: 'https://lin.ee/o5EjHvd'
  },

  /* ---------- お知らせ・試合結果（Googleスプレッドシート） ----------
   * シート：清瀬ジュニアSC サイト更新用シート
   *
   * 【動かし方】スプレッドシートの
   *   「ファイル → 共有 → ウェブに公開」を開き、
   *   ① 「お知らせ」タブを選び、形式を「カンマ区切り値(.csv)」にして公開 → できたURLを newsCsvUrl に貼る
   *   ② 「試合結果」タブも同じようにして、できたURLを resultsCsvUrl に貼る
   *
   * 🔴 ウェブに公開は、タブごと（お知らせ・試合結果だけ）にする。「ドキュメント全体」にしない。
   *    このシートには「欠席連絡ログ」タブ（選手名の列あり）があります。
   *    全体を公開したり、「リンクを知っている全員が閲覧可」の共有にしたりすると、
   *    そのタブまで外から読めてしまいます。
   *
   * 空のままのときは、HTMLに書いてある最新の内容が表示されます。
   */
  sheets: {
    spreadsheetId: '1PJjT4XZpFbunYotZt-mq1Nk3l1Rp2EFURY3lPRTp5ww', // 控え（シートの場所）
    newsCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjpjf_EgSPf85RrLMmFuhzpThad0H0DS2ntjhZuFnVmNSNnXgyjF0tMdzzTv_hVur3vk-Ueh9mkxXW/pub?gid=0&single=true&output=csv',     // 例）https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv
    resultsCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjpjf_EgSPf85RrLMmFuhzpThad0H0DS2ntjhZuFnVmNSNnXgyjF0tMdzzTv_hVur3vk-Ueh9mkxXW/pub?gid=1&single=true&output=csv',  // 例）https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123&single=true&output=csv
    // 欠席連絡ログの選手名を守るため、「リンクを知っている全員が閲覧可」の共有で読む方法は用意していません。
    // 必ず、上の「ウェブに公開」をタブごとに行ってください。
    // お知らせタブの列：日付｜カテゴリ｜タイトル｜詳細｜掲載状態（「公開中」の行だけ表示）
    // 試合結果タブの列：大会名｜回戦｜対戦相手｜スコア｜結果｜出典URL
  },

  /* ---------- 活動予定（Googleカレンダー） ----------
   * チーム共用アカウントで、公開カレンダーを作ります。
   * calendarId : カレンダーの設定 → 「カレンダーの統合」にある「カレンダーID」
   * apiKey     : Google Cloud で発行した「Calendar API」のキー
   * 2つとも入れると、カレンダーの予定が表示されます。
   * 空のままのときは、content/events.js に書いた予定が表示されます。
   * 入れたのに読めなかったときは、古い予定にはもどらず、「読み込めませんでした」と出ます。
   *
   * 🔑 apiKey には、Google Cloud の「APIキーの制限」で、次の2つを必ずかけてください。
   *    ① アプリケーションの制限：「ウェブサイト」
   *         kiyose-jr-sc.club/*  と  kiyose-jr-sc.vercel.app/*
   *    ② API の制限：「キーを制限」→ Google Calendar API だけ
   *    （このキーは公開されるファイルに入るので、制限がないと他の人に使われてしまいます）
   *
   * ✏️ コーチ向け：予定の書き方
   *    いまの書き方のまま、Googleカレンダーに入れてください。サイトが読み取ります。
   *      例）⑤⑥練習 清明小13〜16     →  ⑤⑥ ／ 練習 ／ 清明小学校 ／ 13:00〜16:00
   *          幼①②③練習 八小 13〜15  →  幼①②③ ／ 練習 ／ 清瀬第八小学校 ／ 13:00〜15:00
   *          ⑤⑥U12リーグ 内山A 12:30〜17  →  ⑤⑥ ／ U12リーグ ／ 内山グランドA面 ／ 12:30〜17:00
   *    ・学年の印（幼・①〜⑥）は、いちばん先頭に書きます（学年の絞り込みにも使われます）。
   *    ・時間は「13〜15」「12:30〜17」「7半〜14」「5:30〜12」「18-21」の形で、タイトルの中に書けば読み取ります（5時〜23時台）。
   *      （カレンダーで開始・終了の時刻を入れた予定は、その時刻が優先されます）
   *    ・会場は、下の venues にある略称（清明小・八小・内山A など）で書けます。
   *      カレンダーの「場所」に入れたときは、そちらが優先されます。
   *    ・タイトルに時間がない終日の予定は、説明の中の「日時：…13:00〜17:00」の行から時間を読み取ります。
   *    ・「説明」に書いた持ち物・集合などは、予定をタップすると出ます。https:// で始まるリンクは、押せるリンクになります。
   *    ・種目を書かずに「⑤⑥ 清明小 13〜16」とだけ書いたときは、「練習」と表示されます。
   *    ・読み取れない書き方のときは、書いたとおりにタイトルへ出ます（壊れません）。
   *    ・子どもの名前など、個人がわかることは書かないでください（ページは誰でも見られます）。
   */
  calendar: {
    calendarId: '',
    apiKey: '',
    // 種目が書かれていない予定のタイトル
    defaultTitle: '練習',
    // タイトルの頭にあると外す言葉（「清瀬ジュニアSC蹴り納め」→「蹴り納め」。サイト自体がクラブのものなので不要）
    stripFromTitle: ['清瀬ジュニアSC'],
    // 会場の略称 → 表示する名前。足したいときは、この中に1行足してください（略称を左、正式名を右）。
    venues: {
      '清明小': '清明小学校',
      '八小': '清瀬第八小学校',
      '神宝小': '神宝小学校',
      '内山A': '内山グランドA面',
      '内山B': '内山グランドB面',
      '内山C': '内山グランドC面',
      '久留総': '久留総',
      'コミプラ': 'コミュニティプラザひまわり'
    }
  },

  /* ---------- 計測（Googleタグマネージャー） ----------
   * GTM の「コンテナID」（GTM-で始まる英数字）を入れると、全ページで計測のタグが読み込まれます。
   * 空のままのときは、計測のものは何も読み込みません。
   * 例）gtmId: 'GTM-ABC1234'
   */
  analytics: {
    gtmId: 'GTM-KTW2X8Q6'
  },

  /* ---------- 資料（Googleドライブ） ----------
   * 共有フォルダ（閲覧のみ）のURLを入れると、「資料フォルダを開く」ボタンが出ます。
   */
  drive: {
    folderUrl: ''
  },

  /* ---------- 欠席・遅刻連絡 / お問い合わせ（Googleフォーム） ----------
   * どちらも、次の3つのやり方があります。おすすめは【やり方A】です。
   *
   * 【やり方A】フォームをサイトの中に表示する（おすすめ）
   *            Googleフォームの編集画面で
   *              右上「送信」→ 真ん中のタブ「< >」（埋め込む）
   *            を開くと、<iframe src="https://docs.google.com/forms/d/e/…/viewform?embedded=true" …>
   *            という文字が出ます。その src="" の中のURLだけを、embedUrl に貼ってください。
   *            → サイトの中にフォームが出ます。
   *            → あとからフォームの質問を変えても、サイト側は直さなくて大丈夫です。
   *            ※ https://docs.google.com/ で始まるものだけが使えます。
   *            ※ 下に「うまく表示されないときは、こちらから開けます」のリンクも出ます。
   *              （リンク先は viewUrl があればそれ、なければ embedUrl と同じフォームです）
   * 【やり方B】ボタンでフォームを別の画面で開く
   *            Googleフォームの「送信 → リンク」（鎖のマーク）のURLを viewUrl に貼る。
   *            → サイトに「フォームを開く」ボタンが出ます。
   *            ※ embedUrl が入っているときは、やり方Aが優先されます。
   * 【やり方C】サイトのデザインのまま送りたいとき（むずかしい）
   *            action に「…/formResponse」で終わるURL、
   *            fields に各質問の「entry.数字」を入れる（作った人に聞いてください）。
   *            ※ 対象日の質問は、フォーム側を「記述式」にしてください。
   *
   * 優先順位：embedUrl（サイトの中に表示）→ viewUrl（ボタン）→ action（サイトのフォーム）
   * すべて空のときは、「準備中です」と表示され、送信できません。
   */
  forms: {
    // 欠席・遅刻連絡フォームのURLは、ここには書かない（このファイルは誰でも読めるため）。
    // Vercel の環境変数 ABSENCE_FORM_URL に入れると、保護者ページの鍵を通った人にだけ渡ります。
    absence: {
      embedUrl: '',
      viewUrl: '',    // 例）https://forms.gle/…
      action: '',
      fields: { grade: '', name: '', date: '', type: '', note: '' }
    },
    contact: {
      embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSen7nAOaKsxfdvmDb7h2PbZJ6iBsQf6FVijrTWsgu_XMioUuA/viewform?embedded=true',   // 例）https://docs.google.com/forms/d/e/1FAIpQLS…/viewform?embedded=true
      viewUrl: '',    // 例）https://forms.gle/…
      action: '',
      fields: { name: '', email: '', subject: '', body: '' }
    }
  }
};
