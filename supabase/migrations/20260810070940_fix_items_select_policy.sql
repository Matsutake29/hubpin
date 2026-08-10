-- 🚨 PERMISSIVE ポリシーは OR で結合される。
-- 「公開カードは誰でも」と「自分のカードは本人だけ」を両方ロール指定なしで書いたため、
-- ログイン中は (visible = true) OR (auth.uid() = user_id) になり、
-- 他人の公開カードまで見えていた（2026-08-10 工程7 手順2で発覚）。
-- 用途で分けたつもりが、ロールで分けていなかった。

drop policy "visible items are viewable by everyone" on public.items;

-- 公開ページは public.ts（cookie なし＝anon）で読むので、anon にだけ適用すれば足りる
create policy "visible items are viewable by anon"
  on public.items for select to anon using (visible = true);