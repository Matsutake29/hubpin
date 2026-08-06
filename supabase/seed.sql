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

-- guest にも1枚入れておく（マルチテナントが動いていることの証拠になる）
insert into public.items (user_id, type, title, description, url, sort_order) values
  ('b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b', 'link', 'Hubpin について', 'デモ用アカウントです', 'https://hub.mt-tk.com/', 1);