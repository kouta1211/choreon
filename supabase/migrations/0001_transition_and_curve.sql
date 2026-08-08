-- =========================================================================
-- 0001: 遷移時間(シーン/ダンサー個別)と自由曲線パスの制御点を追加する
-- =========================================================================
-- 対象: supabase/schema.sql の `create table` 群を適用済みで、その後に
--       追加された列がまだ入っていない既存のSupabaseプロジェクト。
--
-- 使い方: Supabaseダッシュボード > SQL Editor にこのファイルの中身を
--         そのまま貼り付けて実行する。
--
-- このファイルは【何度実行しても安全】に作ってある。
--   - 列の追加は `add column if not exists`
--   - CHECK制約は `drop constraint if exists` してから add し直す
-- そのため「前に流したか覚えていない」場合は、とりあえず流して構わない。
--
-- なぜ必要か:
--   アプリ側の「シーンごとの遷移時間」「ダンサーごとの遷移時間の上書き」
--   「導線を曲線に曲げる」機能は、いずれもここで追加する列に書き込む。
--   列が無いままこれらを操作すると、PostgRESTが PGRST204
--   (Could not find the '...' column of 'positions' in the schema cache)
--   を返し、アプリ上は「〜に失敗しました」というトーストになる。
--
-- GRANT・RLSポリシーについて:
--   いずれも既存テーブルへの【列の追加】のみで、新規テーブルは作らない。
--   GRANTとRLSは列単位ではなく行・テーブル単位で効くため、再設定は不要。
--   念のためファイル末尾の確認クエリで、意図通りのままであることを確認する。
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. scenes.transition_duration_seconds
--    「このシーンへ遷移してくるまでの所要時間」(秒)。先頭シーンの値は使わない。
--    既存行にはデフォルト値の1秒が入る。
-- -------------------------------------------------------------------------
alter table public.scenes
  add column if not exists transition_duration_seconds numeric not null default 1;

alter table public.scenes
  drop constraint if exists scenes_transition_duration_seconds_check;
alter table public.scenes
  add constraint scenes_transition_duration_seconds_check
  check (
    transition_duration_seconds::float8 > 0
    and transition_duration_seconds::float8 <= 30
  );


-- -------------------------------------------------------------------------
-- 2. positions.dancer_transition_duration_seconds
--    このダンサー・このシーンだけ、シーンの既定の遷移時間を上書きする値。
--    null = シーンの既定値を使う(これまで通り全員が同じ速さで動く)。
-- -------------------------------------------------------------------------
alter table public.positions
  add column if not exists dancer_transition_duration_seconds numeric;

alter table public.positions
  drop constraint if exists positions_dancer_transition_duration_seconds_check;
alter table public.positions
  add constraint positions_dancer_transition_duration_seconds_check
  check (
    dancer_transition_duration_seconds is null
    or (
      dancer_transition_duration_seconds::float8 > 0
      and dancer_transition_duration_seconds::float8 <= 30
    )
  );


-- -------------------------------------------------------------------------
-- 3. positions.curve_control_x / curve_control_y
--    自由曲線パス(二次ベジェ)の制御点。ステージ座標系で持つ。
--    null = 前シーンの位置からの直線移動。
--
--    CHECK制約が `x::float8 = x::float8` という一見無意味な式なのは、
--    NaN混入を弾くため。numeric型は特殊値 'NaN' を許容し、NaN同士の比較は
--    IEEE754の規則で必ず false になるので、これだけでNaNを排除できる
--    (座標の上限はプロジェクトごとに可変なのでDB側では表現できない)。
-- -------------------------------------------------------------------------
alter table public.positions
  add column if not exists curve_control_x numeric;

alter table public.positions
  drop constraint if exists positions_curve_control_x_check;
alter table public.positions
  add constraint positions_curve_control_x_check
  check (curve_control_x is null or curve_control_x::float8 = curve_control_x::float8);

alter table public.positions
  add column if not exists curve_control_y numeric;

alter table public.positions
  drop constraint if exists positions_curve_control_y_check;
alter table public.positions
  add constraint positions_curve_control_y_check
  check (curve_control_y is null or curve_control_y::float8 = curve_control_y::float8);


-- -------------------------------------------------------------------------
-- 4. PostgRESTのスキーマキャッシュを更新する
--    列を追加しても、PostgRESTが内部に持つスキーマキャッシュが古いままだと
--    しばらく PGRST204 が返り続けることがある。この通知で即座に貼り直させる。
-- -------------------------------------------------------------------------
notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ(個人ルール: 必ず実行して確認する)
-- =========================================================================

-- 4-1. 意図した列が揃ったか。3行すべてが exists = true になれば成功
select
  'scenes.transition_duration_seconds' as column_name,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scenes'
      and column_name = 'transition_duration_seconds'
  ) as exists
union all
select
  'positions.dancer_transition_duration_seconds',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'positions'
      and column_name = 'dancer_transition_duration_seconds'
  )
union all
select
  'positions.curve_control_x / curve_control_y',
  (
    select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'positions'
      and column_name in ('curve_control_x', 'curve_control_y')
  );

-- 4-2. GRANT状況の確認(anonの行が出てこないことを確認する)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('projects', 'dancers', 'scenes', 'positions')
order by grantee, privilege_type;

-- 4-3. RLSポリシーの確認(4テーブル分のポリシーが想定通り出ることを確認する)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename in ('projects', 'dancers', 'scenes', 'positions');
