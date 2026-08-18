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
-- 実際のステージは正方形になることは稀なため、デフォルトは横14×縦10ユニット
-- (12.6m×9m相当)にしている。幅を偶数にしているのは、奇数だと中心が
-- 格子点の間(7.5)に来てしまい、格子に吸着するダンサーを「ちょうど中央」に
-- 置けなくなるため
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  stage_width integer not null default 14,
  stage_height integer not null default 10,
  -- 曲の何秒目からこの作品が始まるか。振付は曲の頭からではなく
  -- イントロの後から始まることが多いので、その頭出しの位置を覚えておく。
  -- 音源そのものは持たない(端末のファイルを選ぶ方式でStorageは使わない)
  music_offset_seconds numeric not null default 0
    check (music_offset_seconds::float8 >= 0),
  -- 曲の速さと拍子。曲を入れずにカウントで組むとき、時間軸の地は波形ではなく
  -- 8カウントの縞になる。その縞を引くにはBPMが要る。音源は共有しない方針
  -- なので、共有された相手の画面に出せる手がかりは「シーンの時刻」とこれだけ
  bpm numeric not null default 120
    check (bpm::float8 >= 40 and bpm::float8 <= 240),
  -- 稽古場で数える単位は小節ではなく8カウントで、それは拍子とは別。
  -- ただし4拍子以外の曲もあるため、メトロノームの強拍だけはこの値で決める
  beats_per_bar integer not null default 4
    check (beats_per_bar >= 2 and beats_per_bar <= 12),
  -- 振付師がメトロノーム(クリック)を鳴らしているか。
  -- **見る人にも引き継ぐためにここへ置いている。** 音源そのものは共有
  -- しないが、クリックは BPM と拍子から合成できるので共有できる。
  -- 以前は端末ごとの設定(localStorage)だったが、それだと
  -- 「振付師が決めたとおりに見える」が成り立たなかった
  is_metronome_enabled boolean not null default false,
  -- 「リンクを知っている人だけ」に見せるための合鍵と、そのオン/オフ。
  -- トークンは常に持っているが、is_shared が false の間はどのリンクでも
  -- 開けない。閲覧は public.shared_project(token) 経由で、テーブルそのものは
  -- 持ち主にしか開いていない(migration 0007 の説明を参照)
  share_token uuid not null default gen_random_uuid() unique,
  is_shared boolean not null default false,
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
-- time_secondsは「この隊形は曲の何秒目か」。これが時間の正で、並び順も
-- この昇順で決まる。移動にかかる時間は「次のシーンの時刻 − このシーンの時刻」
-- として毎回求める(sceneTiming.ts)。
--
-- 以前は逆に「前のシーンからここへ来るのに何秒か」(transition_duration_seconds)
-- を持ち、時刻を足し算で出していた。その持ち方だと途中の1つを変えるだけで
-- 以降が全部後ろへずれ、曲のサビに合わせて置いた隊形がサビから外れた。
-- 旧列は migration 0006 で落としてある。
--
-- order_indexは時刻が同じときの並びを決めるためだけに残している
-- (アプリは0.1秒以上空けるので、通常は出番が無い)
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  order_index integer not null,
  time_seconds numeric not null default 0
    check (time_seconds::float8 >= 0),
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
-- 共有リンク: テーブルは閉じたまま、関数だけを開ける
-- =========================================
-- anon にテーブルの権限は渡さない。トークンを受け取る関数を1つだけ
-- 開放し、その中で「共有がオンで、トークンが一致する作品」に絞る。
-- security definer は「関数を作った人の権限で動く」指定で、これが無いと
-- 関数の中でも RLS に弾かれる。危ないのは引数の検査を忘れたときなので、
-- where 句で share_token と is_shared を必ず見ること
create or replace function public.shared_project(token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    -- 合鍵そのもの(share_token)と、持ち主が誰か(user_id)は返さない
    'project', to_jsonb(p) - 'share_token' - 'user_id',
    'dancers', coalesce(
      (
        select jsonb_agg(to_jsonb(d) order by d.created_at)
        from public.dancers d
        where d.project_id = p.id
      ),
      '[]'::jsonb
    ),
    'scenes', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.time_seconds, s.order_index)
        from public.scenes s
        where s.project_id = p.id
      ),
      '[]'::jsonb
    ),
    'positions', coalesce(
      (
        select jsonb_agg(to_jsonb(pos))
        from public.positions pos
        join public.scenes s2 on s2.id = pos.scene_id
        where s2.project_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from public.projects p
  where p.share_token = token
    and p.is_shared;
$$;

revoke all on function public.shared_project(uuid) from public;
grant execute on function public.shared_project(uuid) to anon, authenticated;

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
-- 既存プロジェクトへの追いつきについて
-- =========================================
-- 上の `create table` 群は「最新のスキーマ」であり、**DBを新規構築するとき
-- だけ**そのまま流せばよい。
--
-- 既にテーブルがあるSupabaseプロジェクトに後から列を足すときは、下の
-- 「追いつき」を SQL Editor で流す。**どれも何度実行しても安全**に
-- 書いてあるので、適用済みか分からなければ流してよい。
--
-- (以前は supabase/migrations/ に番号順のファイルを置いていたが、すべて
--  適用済みになったため削除した。以後はここへ追記する。
--  このファイルの末尾に追記式で並べると、新規構築時は「列が既にある」で
--  失敗し、既存プロジェクトでは先頭の create table で失敗する、という
--  どちらでも通らないファイルになるため、コメントの中に置いている)

-- -----------------------------------------
-- 2026-08-18 メトロノームを作品の設定にする
-- -----------------------------------------
-- 見る人(共有リンク)にも振付師の設定を引き継ぐため、端末ごとの設定から
-- 作品の列へ移した。共有用の関数 shared_project は to_jsonb(p) で作品の列を
-- まるごと返すので、関数側の変更は要らない。
--
-- alter table public.projects
--   add column if not exists is_metronome_enabled boolean not null default false;
--
-- 確認:
-- select column_name, data_type, column_default, is_nullable
-- from information_schema.columns
-- where table_name = 'projects' and column_name = 'is_metronome_enabled';
