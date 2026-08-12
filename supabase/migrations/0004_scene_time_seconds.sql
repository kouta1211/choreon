-- =========================================================================
-- 0004: シーンに「曲の何秒目か」を持たせる
-- =========================================================================
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】(if not exists / 冪等なupdate)。
--
-- 何のための列か:
--   これまでシーンは transition_duration_seconds =「前のシーンから
--   ここへ来るのに何秒か」を持っていた。時刻は先頭から足し算で出していた。
--
--   この持ち方だと、途中のシーンの秒数を1つ変えるだけで、それ以降の
--   シーンが全部後ろへずれる。曲の「サビの頭」に合わせて置いたシーンが、
--   手前の移動を1秒延ばしただけでサビから外れる、ということが起きていた。
--
--   time_seconds は「この隊形は曲の何秒目か」を直接持つ。手前を変えても
--   触っていないシーンは動かない。移動にかかる時間は
--   「次のシーンの時刻 − このシーンの時刻」で毎回求める。
--
-- transition_duration_seconds はどうするか:
--   【消さずに残す】。この移行で読まなくなるが、列を落とすと戻せなくなる。
--   下の backfill が正しく効いたことを確かめたうえで、しばらく様子を見て
--   から別のマイグレーションで落とす。
-- =========================================================================


alter table public.scenes
  add column if not exists time_seconds numeric not null default 0;

-- 負の時刻は無い(曲の頭より前という意味になってしまう)。
-- NaN混入の防止は他の秒数列と同じく ::float8 にキャストして比較する
alter table public.scenes
  drop constraint if exists scenes_time_seconds_check;

alter table public.scenes
  add constraint scenes_time_seconds_check
  check (time_seconds::float8 >= 0);


-- =========================================================================
-- 既存データの移し替え(backfill)
-- =========================================================================
-- 各プロジェクトの中で order_index 順に並べ、自分より前の
-- transition_duration_seconds を足し上げたものが、そのシーンの時刻になる。
-- 先頭シーンは「そこへ入ってくる元」が無いので 0 秒。
--
-- 既に移し替え済みの行(time_seconds が 0 以外)は触らない。
-- ただし先頭シーンは正しく 0 なので、その判定だけでは「未実行」と
-- 区別が付かない。プロジェクト単位で「全部 0 かどうか」を見て決める。
with cumulative as (
  select
    id,
    coalesce(
      sum(transition_duration_seconds) over (
        partition by project_id
        order by order_index
        rows between unbounded preceding and 1 preceding
      ),
      0
    ) as computed_time
  from public.scenes
),
untouched as (
  select project_id
  from public.scenes
  group by project_id
  having max(time_seconds) = 0
)
update public.scenes as s
set time_seconds = c.computed_time
from cumulative as c
where s.id = c.id
  and s.project_id in (select project_id from untouched);


notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ
-- =========================================================================

-- 4-1. 列が追加されたか
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'scenes'
  and column_name = 'time_seconds';

-- 4-2. 移し替えの結果。order_index 順に時刻が増えていれば成功。
--      transition_duration_seconds との差分も並べて確認する
select
  project_id,
  order_index,
  name,
  transition_duration_seconds as old_duration,
  time_seconds,
  time_seconds - lag(time_seconds) over (
    partition by project_id order by order_index
  ) as derived_duration
from public.scenes
order by project_id, order_index;

-- 4-3. GRANTの確認。
--      scenes は個人データ(ユーザーごとに分離すべきもの)なので、
--      anon に権限が付いていてはいけない。anon の行が出たら剥奪する:
--        revoke all on public.scenes from anon;
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'scenes'
order by grantee, privilege_type;

-- 4-4. RLSポリシーの確認。
--      列を足しただけなのでポリシーは変わらないが、この列も
--      既存の「自分の作品だけ」のポリシー配下に入ることを確かめる
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'scenes';
