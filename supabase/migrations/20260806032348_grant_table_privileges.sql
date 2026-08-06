-- RLS の手前にあるテーブル権限。RLS は「どの行か」を決めるが、
-- そもそもテーブルに触れるかは GRANT が決める（二段構え）
--
-- ⚠️  Supabase の自動付与はマイグレーション経由だと効かなかったため、明示的に書く

-- 未認証（anon）は読むだけ。書き込み権限そのものを与えない
grant select on public.profiles to anon;
grant select on public.items    to anon;

-- ログイン済み（authenticated）は操作できる。
-- 🚨 ただし「どの行を」操作できるかは RLS ポリシーが決める
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.items to authenticated;