insert into public.profiles (id, username, display_name, display_name_en, title) values
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'matsutake', '松尾 赳治', 'Takeharu Matsuo', 'Web制作 / フロントエンド'),
  ('b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b', 'guest', 'ゲスト', 'Guest', 'デモ用アカウント');

insert into public.items (user_id, type, title, description, url, sort_order) values
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'link', 'Portfolio',        '制作実績サイトへ',           'https://portfolio.mt-tk.com/',                      1),
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'feed', 'Blog',             'Life Builder の最新記事',     'https://blog.mt-tk.com/',                           2),
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'note', 'Plate Calculator', 'バーベルのプレート計算アプリ', 'https://plate-calculator-zeta.vercel.app/',         3),
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'link', 'Roadmap',          'これからやることの記録',       'https://blog.mt-tk.com/frontend-tenkou-roadmap/',   4),
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'link', 'X',                '日々の発信',                 'https://x.com/Matsutake_prgrm',                     5),
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'feed', 'Zenn',             '技術記事',                   'https://zenn.dev/matsutake_prgrm',                  6),
  ('a12690b6-fc45-4514-978b-8b06315a6604', 'feed', 'GitHub',           '最近更新したリポジトリ',       'https://github.com/Matsutake29',                    7);

-- 🚨 guest の items はここに書かない（2026-08-20・工程11.2 で削除した）。
--
--    guest のカードは src/lib/demo-seed.ts の DEMO_ITEMS が持つ。デモログインのたびに
--    resetDemoData() が guest の items を全削除してから入れ直すので、ここに書いた行は
--    誰かがデモにログインした時点で消える。⭐ 実際に人が見るのは demo-seed.ts のほう。
--
--    それでも両方に書いていたため、同じ「Hubpin について」カードの description が
--    2箇所で食い違っていた（ここは「デモ用アカウントです」、demo-seed.ts は
--    「デモ用アカウントです。自由に編集してください」）。工程5の手順書は「片方を直したら
--    もう片方も直す」と書いていたが、運用で守るのをやめて出所を1つにした。
--
-- ⚠️ profiles の guest 行は上に残してある。消すと demo-seed.ts が user_id を紐づけられない。
--    🚨 「マルチテナントが動いている証拠」という当初の意図はここでは示せなくなった。
--    それは公開ページ（/matsutake と /guest が別々に出る）が示している。