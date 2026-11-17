// 保護者ページ（/parents/）にだけ、ID とパスワードの鍵をかける（Basic 認証）。
// ID とパスワードはコードに書かない。Vercel の環境変数 PARENTS_USER / PARENTS_PASS から読む。
// 環境変数が入っていないときは、鍵を開けっぱなしにせず「準備中」で閉じておく。

export const config = {
  matcher: ['/parents', '/parents/:path*'],
};

const NO_STORE = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

// 文字列の長さに関係なく、同じ手間で比べる
function same(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] || 0) ^ (y[i] || 0);
  }
  return diff === 0;
}

function decode(b64) {
  try {
    const bin = atob(b64);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return '';
  }
}

export default function middleware(request) {
  const user = process.env.PARENTS_USER;
  const pass = process.env.PARENTS_PASS;
  if (!user || !pass) {
    return new Response('保護者向けページは、ただいま準備中です。', { status: 503, headers: NO_STORE });
  }

  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Basic\s+(.+)$/i);
  if (m) {
    const pair = decode(m[1].trim());
    const i = pair.indexOf(':');
    if (i >= 0 && same(pair.slice(0, i), user) && same(pair.slice(i + 1), pass)) {
      return; // 合っていれば、そのままページへ通す
    }
  }

  return new Response('保護者向けのページです。クラブからお知らせしている ID とパスワードを入力してください。', {
    status: 401,
    headers: { ...NO_STORE, 'WWW-Authenticate': 'Basic realm="kiyose-jr-sc parents", charset="UTF-8"' },
  });
}
