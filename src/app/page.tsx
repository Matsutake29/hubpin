import Link from "next/link";

const links = [
  {
    href: "/matsutake",
    title: "実物を見る",
    description: "作者のハブページ。実際に使われている状態",
    external: false,
  },
  {
    href: "/guest",
    title: "デモを見る",
    description: "デモ用アカウント。中身は自由に編集できる",
    external: false,
  },
  {
    href: "https://github.com/Matsutake29/hubpin",
    title: "ソースコード",
    description: "実装と、設計の判断を残したコミット履歴",
    external: true,
  },
];

const stack = [
  { name: "Next.js 16", detail: "App Router / ISR による静的配信" },
  { name: "TypeScript 5", detail: "React 19" },
  { name: "Tailwind CSS v4", detail: "CSS変数によるトークン設計" },
  { name: "Supabase", detail: "PostgreSQL / Auth / 行レベルセキュリティ" },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16 sm:gap-20 sm:py-24">
      <header className="flex items-baseline gap-3">
        <span className="text-lg font-bold tracking-tight text-main">Hubpin</span>
        <span className="font-mono text-xs text-muted">Hub a nice trip.</span>
      </header>

      <main className="flex flex-col gap-16 sm:gap-20">
        <section className="flex flex-col gap-6">
          <h1 className="text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
            分散した発信を、
            <br className="sm:hidden" />
            1つのページに集約する。
          </h1>
          {/* auto-phrase = 日本語を文節で改行する。未対応ブラウザは通常の折り返しに落ちる */}
          <p className="max-w-2xl leading-8 [word-break:auto-phrase]">
            ブログ、X、GitHub。発信の場所が増えるほど、見る人は全部を追いかけられなくなる。
            Hubpin はそれらを1枚にまとめて公開する。更新はコードを触らずにでき、ページは静的なまま速い。
          </p>
        </section>

        <nav aria-label="ページの一覧">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {links.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a
                    className="pin-card h-full"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span aria-hidden="true" className="pin-head pin-head--fill" />
                    <span className="font-bold">
                      {link.title}
                      <span aria-hidden="true" className="ml-1.5 text-xs font-normal text-muted">
                        ↗
                      </span>
                    </span>
                    <span className="text-sm leading-6 text-muted">{link.description}</span>
                  </a>
                ) : (
                  <Link className="pin-card h-full" href={link.href}>
                    <span aria-hidden="true" className="pin-head pin-head--fill" />
                    <span className="font-bold">{link.title}</span>
                    <span className="text-sm leading-6 text-muted">{link.description}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <section className="flex flex-col gap-5">
          {/* 見出しは日本語なので sans。mono は「機械が扱う文字列」だけに使う */}
          <h2 className="text-xs font-bold text-muted">技術スタック</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-[10rem_1fr] sm:gap-y-3">
            {stack.map((item) => (
              <div key={item.name} className="contents">
                <dt className="font-mono text-sm">{item.name}</dt>
                <dd className="text-sm leading-6 text-muted">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line pt-6 text-sm text-muted">
        作 — まつたけ
      </footer>
    </div>
  );
}
