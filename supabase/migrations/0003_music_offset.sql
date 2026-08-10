-- =========================================================================
-- 0003: プロジェクトに「曲の開始オフセット」を持たせる
-- =========================================================================
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】(if not exists / 冪等なalter)。
--
-- 何のための列か:
--   曲を流しながらフォーメーションを確認するとき、振付は曲の頭からでは
--   なく途中(イントロの後)から始まることが多い。「この作品は曲の何秒から
--   始まるか」を1つ持たせておくと、再生ボタンを押すだけで毎回そこから
--   鳴らせる。
--
--   音源そのものはここには入れない。ブラウザで端末のファイルを選ぶ方式に
--   しており、Supabase Storage は使わない。保存するのはタイミングだけ。
--
-- なぜ numeric で 0 以上だけか:
--   秒数なので負にはならない。上限はDB側では決めない(曲の長さは
--   プロジェクトごとに違い、DBはその曲を知らないため)。
--   NaN混入の防止は他の秒数列と同じく ::float8 にキャストして比較する
--   (numericのままだと NaN >= 0 が true になり、チェックをすり抜ける)。
-- =========================================================================


alter table public.projects
  add column if not exists music_offset_seconds numeric not null default 0;

-- 制約は付け直しになるので、いったん落としてから付ける(再実行しても安全)
alter table public.projects
  drop constraint if exists projects_music_offset_seconds_check;

alter table public.projects
  add constraint projects_music_offset_seconds_check
  check (music_offset_seconds::float8 >= 0);


notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ
-- =========================================================================

-- 3-1. 列が追加されたか
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'projects'
  and column_name = 'music_offset_seconds';

-- 3-2. GRANTの確認。
--      projects は個人データ(ユーザーごとに分離すべきもの)なので、
--      anon に権限が付いていてはいけない。anon の行が出たら剥奪する:
--        revoke all on public.projects from anon;
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'projects'
order by grantee, privilege_type;

-- 3-3. RLSポリシーの確認。
--      列を足しただけなのでポリシーは変わらないが、この列も
--      既存の「自分の行だけ」のポリシー配下に入ることを確かめる
--      (ポリシーは行単位で効くため、列を足しても穴は開かない)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'projects';
