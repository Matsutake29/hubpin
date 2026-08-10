"use client";
import { useState } from "react";

export type Item = {
  type: "link" | "note" | "feed";
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  sort_order: number;
};

export function CardGrid({ items }: { items: Item[] }) {
  // ①-1 開いているカードの id を1つだけ持つ。何も開いていない状態を null で表す
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        // 開いたカードだけ全幅にする。col-span-3 ではない（列数が 3/2/1 と変わっても効くように）。
        // li を縦の flex にしてカードは grow で余りを埋める。h-full だと「行の高さ」が
        // 親に解決されてしまい、展開部のぶんだけ次の行へはみ出す
        return (
          <li key={item.id} className={`flex flex-col ${isOpen ? "col-span-full" : ""}`}>
            {item.type === "link" && item.url ? (
              <a
                className="pin-card grow"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* 塗り＝外部へ飛ぶ。note / feed は中空のまま（開くことを示す） */}
                <span aria-hidden="true" className="pin-head pin-head--fill" />
                <span className="font-bold">
                  {item.title}
                  <span aria-hidden="true" className="ml-1.5 text-xs font-normal text-muted">
                    ↗
                  </span>
                </span>
                {item.description && (
                  <span className="text-sm leading-6 text-muted">{item.description}</span>
                )}
              </a>
            ) : (
              <>
                <button
                  type="button"
                  // 開いている間はカードと展開部を1枚の紙として見せる（下の角丸を落として地続きにする）
                  className={`pin-card grow text-left ${isOpen ? "rounded-b-none" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls={`panel-${item.id}`}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                >
                  <span aria-hidden="true" className="pin-head" />
                  <span className="font-bold">{item.title}</span>
                </button>
                <div
                  id={`panel-${item.id}`}
                  hidden={!isOpen}
                  // 上辺を持たない。カードの border-bottom がそのまま区切り線になる
                  className="pin-panel rounded-(--radius) rounded-t-none border border-t-0 bg-sub p-5 text-sm leading-7"
                >
                  {item.description}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
