-- =========================================================================
-- 0000: ステージの既定サイズ変更と、座標・角度カラムのCHECK制約
-- =========================================================================
-- 対象: supabase/schema.sql の初版で構築済みの既存Supabaseプロジェクト。
--       新規プロジェクト(schema.sql をそのまま流した場合)は既にこの内容を
--       含んでいるため、実行しても何も変わらない(＝流して構わない)。
--
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】。
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. 新規プロジェクトの既定ステージサイズを 15 x 10 ユニットにする
--    実際のステージが正方形になることは稀なため。1ユニット = 実寸90cm相当
--    なので 13.5m x 9m にあたる。既存行の値は変更しない。
-- -------------------------------------------------------------------------
alter table public.projects alter column stage_width set default 15;
alter table public.projects alter column stage_height set default 10;


-- -------------------------------------------------------------------------
-- 2. 座標・角度カラムのCHECK制約(DB側の最終防衛ライン)
--
--    ::float8 にキャストしてから比較しているのは、numeric型が特殊値 'NaN' を
--    許容し、かつ numeric の 'NaN' >= 0 が(数値の直感に反して)true になるため。
--    float8 へのキャストなら IEEE754 の規則で NaN との比較は必ず false になり、
--    範囲外の値と同時に NaN も弾ける。
--
--    x/y の上限をDB側に持たせていないのは、上限であるステージサイズが
--    projects ごとに可変で、単純な check からは他テーブルの値を参照できないため。
--    上限側はアプリの clamp() が担保する。
--
--    もし「制約に違反する行があります」というエラーが出た場合は、
--    該当行を先に修正してから再実行すること。
-- -------------------------------------------------------------------------
alter table public.dancers
  drop constraint if exists dancers_initial_direction_check;
alter table public.dancers
  add constraint dancers_initial_direction_check
  check (initial_direction::float8 >= 0 and initial_direction::float8 < 360);

alter table public.positions
  drop constraint if exists positions_x_coordinate_check;
alter table public.positions
  add constraint positions_x_coordinate_check
  check (x_coordinate::float8 >= 0);

alter table public.positions
  drop constraint if exists positions_y_coordinate_check;
alter table public.positions
  add constraint positions_y_coordinate_check
  check (y_coordinate::float8 >= 0);

alter table public.positions
  drop constraint if exists positions_rotation_angle_check;
alter table public.positions
  add constraint positions_rotation_angle_check
  check (rotation_angle::float8 >= 0 and rotation_angle::float8 < 360);


notify pgrst, 'reload schema';
