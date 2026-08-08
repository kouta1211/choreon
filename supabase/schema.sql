-- Choreon MVP: 初期スキーマ定義
-- Supabaseの SQL Editor でそのまま実行するか、`supabase db push` 等で適用する。
-- 適用後は、必ずファイル末尾の「適用後の確認クエリ」を実行し、
-- GRANT状況とRLSポリシーが意図通りであることを確認すること
-- (個人ルール: Supabaseのテーブル作成ルール参照)。

-- =========================================
-- 1. projects
-- =========================================
-- stage_width/stage_heightの1ユニットは実寸90cm相当を想定
-- (features/canvas/lib/physicalLimits.tsのMETERS_PER_STAGE_UNITと対応させること)。
-- 実際のステージは正方形になることは稀なため、デフォルトは横15×縦10ユニット
-- (13.5m×9m相当)にしている
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  stage_width integer not null default 15,
  stage_height integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

-- updated_at を自動更新するトリガー
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- =========================================
-- 2. dancers
-- =========================================
-- 角度系カラムは ::float8 にキャストしてから比較している。numeric型は
-- 特殊値'NaN'を許容し、かつ NaN >= 0 は(数値としては直感に反して)true に
-- なるため、numericのまま範囲チェックしてもNaN混入を防げない。float8への
-- キャストならIEEE754のNaN比較(NaNとのどんな比較も false)になるため、
-- 範囲外の値と同時にNaNも弾ける
create table public.dancers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6',
  initial_direction numeric not null default 0
    check (initial_direction::float8 >= 0 and initial_direction::float8 < 360),
  created_at timestamptz not null default now()
);

create index dancers_project_id_idx on public.dancers (project_id);

-- =========================================
-- 3. scenes
-- =========================================
-- transition_duration_secondsは「このシーンへ遷移してくるまでの所要時間」
-- (先頭のシーンの値は使われない)。秒単位で持つのは、再生アニメーションに
-- 使うframer motionのdurationが秒指定のため、変換をあちこちに持たずに済むから
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  order_index integer not null,
  transition_duration_seconds numeric not null default 1
    check (
      transition_duration_seconds::float8 > 0
      and transition_duration_seconds::float8 <= 30
    ),
  created_at timestamptz not null default now()
);

create index scenes_project_id_idx on public.scenes (project_id);

-- =========================================
-- 4. positions (scene_id, dancer_id の複合PK)
-- =========================================
-- x/y座標はアプリ側のclamp()で0以上ステージサイズ以下に収めているが、
-- ステージサイズはproject単位で可変なため上限はDB側では表現できない
-- (単純なcheckでは他テーブルの値を参照できないため)。下限(0以上)と
-- NaN混入の防止だけをDB側の最終防衛ラインとして持たせる
-- dancer_transition_duration_secondsは、このダンサーだけシーンの
-- transition_duration_secondsを上書きしたい場合に使う(null=シーンの既定値)。
-- curve_control_x/yは自由曲線パス(二次ベジェ)の制御点(null=前シーンの
-- 位置からの直線)。どちらもnullを許容する追加的な列で、既存のnot null列とは
-- 独立している
create table public.positions (
  scene_id uuid not null references public.scenes (id) on delete cascade,
  dancer_id uuid not null references public.dancers (id) on delete cascade,
  x_coordinate numeric not null default 0
    check (x_coordinate::float8 >= 0),
  y_coordinate numeric not null default 0
    check (y_coordinate::float8 >= 0),
  rotation_angle numeric not null default 0
    check (rotation_angle::float8 >= 0 and rotation_angle::float8 < 360),
  dancer_transition_duration_seconds numeric
    check (
      dancer_transition_duration_seconds is null
      or (
        dancer_transition_duration_seconds::float8 > 0
        and dancer_transition_duration_seconds::float8 <= 30
      )
    ),
  curve_control_x numeric
    check (curve_control_x is null or curve_control_x::float8 = curve_control_x::float8),
  curve_control_y numeric
    check (curve_control_y is null or curve_control_y::float8 = curve_control_y::float8),
  primary key (scene_id, dancer_id)
);

create index positions_dancer_id_idx on public.positions (dancer_id);

-- =========================================
-- RLS: 個人データ方針(anonには一切権限を持たせない)
-- =========================================
alter table public.projects enable row level security;
alter table public.dancers enable row level security;
alter table public.scenes enable row level security;
alter table public.positions enable row level security;

revoke all on public.projects from anon;
revoke all on public.dancers from anon;
revoke all on public.scenes from anon;
revoke all on public.positions from anon;

-- projects: 自分の行のみ操作可
create policy "Users can manage their own projects"
on public.projects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- dancers: 親projectの所有者のみ操作可(project_id経由でuser_idを辿る)
create policy "Users can manage dancers in their own projects"
on public.dancers
for all
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = dancers.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = dancers.project_id
      and projects.user_id = auth.uid()
  )
);

-- scenes: 親projectの所有者のみ操作可
create policy "Users can manage scenes in their own projects"
on public.scenes
for all
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = scenes.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = scenes.project_id
      and projects.user_id = auth.uid()
  )
);

-- positions: scene_id経由でproject所有者を辿る
create policy "Users can manage positions in their own projects"
on public.positions
for all
to authenticated
using (
  exists (
    select 1 from public.scenes
    join public.projects on projects.id = scenes.project_id
    where scenes.id = positions.scene_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.scenes
    join public.projects on projects.id = scenes.project_id
    where scenes.id = positions.scene_id
      and projects.user_id = auth.uid()
  )
);

-- =========================================
-- 適用後の確認クエリ(個人ルール: 必ず実行して確認する)
-- =========================================

-- 1. GRANT状況の確認(anonの行が出てこないことを確認する)
select grantee, privilege_type
from information_schema.role_table_grants
where table_name in ('projects', 'dancers', 'scenes', 'positions');

-- 2. RLSポリシーの確認(上記4テーブル分のポリシーが想定通り出ることを確認する)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename in ('projects', 'dancers', 'scenes', 'positions');

-- =========================================
-- マイグレーション: デフォルトステージサイズを15×10に変更
-- (このファイルの`create table`はDB初期構築時のみ実行される。既に
-- projectsテーブルが存在するSupabaseプロジェクトでは、下記を
-- SQL Editorで別途実行してカラムのデフォルト値を更新すること。
-- 既存行のstage_width/stage_heightは変更されない)
-- =========================================
alter table public.projects alter column stage_width set default 15;
alter table public.projects alter column stage_height set default 10;

-- =========================================
-- マイグレーション: 座標・角度カラムにCHECK制約を追加
-- (既存のSupabaseプロジェクトでは下記をSQL Editorで実行すること。
-- アプリ側は既にこの範囲でしか値を書き込まないため、通常は失敗しない
-- はずだが、もし「制約に違反する行があります」等のエラーが出た場合は
-- 該当行を先に修正してから再実行すること)
-- =========================================
alter table public.dancers
  add constraint dancers_initial_direction_check
  check (initial_direction::float8 >= 0 and initial_direction::float8 < 360);

alter table public.positions
  add constraint positions_x_coordinate_check
  check (x_coordinate::float8 >= 0);
alter table public.positions
  add constraint positions_y_coordinate_check
  check (y_coordinate::float8 >= 0);
alter table public.positions
  add constraint positions_rotation_angle_check
  check (rotation_angle::float8 >= 0 and rotation_angle::float8 < 360);

-- =========================================
-- マイグレーション: シーンに遷移時間(transition_duration_seconds)を追加
-- (既存のSupabaseプロジェクトでは下記をSQL Editorで実行すること。
-- 既存のscenes行にはデフォルト値1が入る。scenesテーブルへの列追加のみで
-- 新規テーブルではないため、GRANT・RLSポリシーの再設定は不要
-- ―列単位ではなく行・テーブル単位で効くため。念のため上記の確認クエリで
-- scenesのGRANT/RLSが変わっていないことだけ確認しておくとよい)
-- =========================================
alter table public.scenes
  add column transition_duration_seconds numeric not null default 1;
alter table public.scenes
  add constraint scenes_transition_duration_seconds_check
  check (
    transition_duration_seconds::float8 > 0
    and transition_duration_seconds::float8 <= 30
  );

-- =========================================
-- マイグレーション: positionsにダンサー個別の遷移時間・自由曲線パスの
-- 制御点を追加(既存のSupabaseプロジェクトでは下記をSQL Editorで実行すること)
--
-- 3列ともnullを許容する追加的な列(既存行はすべてnullになる=これまで通り
-- シーン一律の速さ・直線移動のまま)。positionsテーブルへの列追加のみで
-- 新規テーブルではないため、GRANT・RLSポリシーの再設定は不要
-- ―列単位ではなく行・テーブル単位で効くため
-- =========================================
alter table public.positions
  add column dancer_transition_duration_seconds numeric;
alter table public.positions
  add constraint positions_dancer_transition_duration_seconds_check
  check (
    dancer_transition_duration_seconds is null
    or (
      dancer_transition_duration_seconds::float8 > 0
      and dancer_transition_duration_seconds::float8 <= 30
    )
  );

alter table public.positions
  add column curve_control_x numeric;
alter table public.positions
  add constraint positions_curve_control_x_check
  check (curve_control_x is null or curve_control_x::float8 = curve_control_x::float8);

alter table public.positions
  add column curve_control_y numeric;
alter table public.positions
  add constraint positions_curve_control_y_check
  check (curve_control_y is null or curve_control_y::float8 = curve_control_y::float8);
