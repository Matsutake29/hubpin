-- #46 DB の権限・制約の残り（工程11.7 のレビューで挙がったもの）
--
-- ⚠️ 当てる前に SQL Editor で次の3本を流し、すべて 0 件であることを確かめる。
--    1件でもあると、その制約の行でマイグレーション全体が落ちる（＝何も変わらない）。
--      select count(*) from public.feed_sources fs join public.items i on i.id = fs.item_id
--        where fs.user_id <> i.user_id;                                  -- 4. の前提
--      select count(*) from public.items where title = '' or (type = 'link' and url is null);  -- 5.
--      select count(*) from public.feed_entries where title = '' or url = '';                  -- 6.
--    あわせて default privileges の持ち主を確かめる（2. が効くのは postgres の分だけ）:
--      select defaclrole::regrole, defaclnamespace::regnamespace, defaclacl from pg_default_acl;

-- 1. 09-06 に TRUNCATE だけ剥がし、同じコメントに書いた REFERENCES と TRIGGER が残っていた。
--    TRIGGER は「そのテーブルにトリガーを付けられる」権限で、RLS はトリガー関数の中身を見ない。
--    今は届く経路が無い（関数を作るには schema への CREATE が要る）が、「今は届かない」は「経路が無い」ではない。
revoke references, trigger on all tables in schema public from anon, authenticated;

-- 2. 上の revoke（と 09-06 の TRUNCATE）は「今あるテーブル」にしか効かない。
--    Supabase 初期の default privileges が grant all のままなので、6枚目のテーブルを作った瞬間に
--    TRUNCATE・REFERENCES・TRIGGER が anon へ復活する。
--    🚨 alter default privileges は「実行したロールが今後作るオブジェクト」にしか効かない。postgres で流すこと。
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

-- 3. set_updated_at() だけ search_path が固定されていなかった（swap_item_order と
--    replace_feed_entries は set search_path = '' を書いている）。
--    ⭐ 本文はそのままでよい。now() は pg_catalog にあり、search_path = '' でも暗黙で先頭に入る。
--       public は暗黙に入らないので、public のものを使う関数は public. を明示する必要がある。
alter function public.set_updated_at() set search_path = '';

-- 4. feed_sources.item_id は items(id) への単独 FK しかなく、「そのカードが自分のものか」を見ていなかった。
--    09-07 の revoke で書き込みの入口は閉じたが、編集 UI を作れば再び開く。
--    ⭐ ポリシーではなく FK にする。ポリシーは書き忘れなければ守る。FK は INSERT / UPDATE /
--       SQL Editor / service_role のどこから来ても守る（service_role は RLS を越えるが FK は越えない）。
alter table public.items add constraint items_id_user_id_key unique (id, user_id);
alter table public.feed_sources
  drop constraint feed_sources_item_id_fkey,
  add constraint feed_sources_item_fkey
    foreign key (item_id, user_id) references public.items (id, user_id) on delete cascade;

-- 5. zod が守っている不変量を DB にも置く。authenticated は items に UPDATE の権限を持つので、
--    PostgREST を直接叩けば zod を素通りできる（影響は RLS で自分の行に閉じている）。
alter table public.items
  add constraint items_title_not_empty check (title <> ''),
  add constraint items_link_has_url check (type <> 'link' or url is not null);

-- 6. 空の title / url の feed_entries を止める。replace_feed_entries は1トランザクションなので、
--    壊れた1件で INSERT ごと落ち、既存のエントリーが残る（＝取得失敗と同じ扱いになる）。
--    📌 アプリ側でも url が空のエントリーは捨てている（#47）。こちらは最後の砦。
alter table public.feed_entries
  add constraint feed_entries_title_not_empty check (title <> ''),
  add constraint feed_entries_url_not_empty check (url <> '');

-- 7. items のポリシー4本にロール指定が無かった（profiles は 20260820122641 で整理済み）。
--    挙動は変わらない（anon の auth.uid() は NULL なので行は落ちる）。記述を揃えるだけ。
alter policy "users can view own items" on public.items to authenticated;
alter policy "users can insert own items" on public.items to authenticated;
alter policy "users can update own items" on public.items to authenticated;
alter policy "users can delete own items" on public.items to authenticated;
