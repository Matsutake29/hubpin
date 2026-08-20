-- 🚨 これはバグ修正ではない。profiles は全行を全員に見せるのが仕様で、動作は1ミリも変わらない。
--    直すのは「ロール指定が無い」という記述のほう。
--
--    PERMISSIVE ポリシーは OR で結合される。いま profiles の select は1本しか無いので
--    結合する相手がおらず、穴は開いていない。🚨 2本目を足した瞬間に開く。
--
--    items が 2026-08-10 にそれを踏んだ（20260810070940_fix_items_select_policy.sql）。
--    「公開カードは誰でも」と「自分のカードは本人だけ」を両方ロール指定なしで書いたため、
--    ログイン中は (visible = true) OR (auth.uid() = user_id) になり、
--    他人の公開カードまで見えていた。用途で分けたつもりが、ロールで分けていなかった。

drop policy "profiles are viewable by everyone" on public.profiles;

-- ⚠️ 2本に分けない。items が2本なのは「ロールごとに条件が違う」から
--    （anon は visible = true ／ 本人は auth.uid() = user_id）。
--    profiles は両ロールとも「全行」で条件が同じなので、1本で両方を指定できる。
--
-- 🚨 to anon だけにしない。ログイン中が自分の profile を読めなくなり、
--    dashboard/layout.tsx のヘッダー（@username）が壊れる。
create policy "profiles are viewable by anon and authenticated"
  on public.profiles for select
  to anon, authenticated
  using (true);
