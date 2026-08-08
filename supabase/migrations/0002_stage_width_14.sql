-- =========================================================================
-- 0002: 既定のステージ幅を 15 → 14 にする
-- =========================================================================
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】。
--
-- なぜ14か:
--   幅が奇数(15)だと中心が x=7.5 になり、格子点の上に乗らない。
--   ダンサーの位置は格子(整数ユニット)に吸着するため、15マスのステージでは
--   「ちょうど真ん中に立つ」ことができず、シンメトリーの軸に人を置けなかった。
--   偶数(14)なら中心 x=7 が格子点そのものになり、中央に1人置ける。
--   1ユニット=実寸約90cmなので 14x10 = 12.6m x 9m 相当。
-- =========================================================================


-- 1. これから作るプロジェクトの既定値
alter table public.projects alter column stage_width set default 14;


-- 2. 既存プロジェクトのうち、まだ 15 のまま(=直前の既定値から動かして
--    いない)ものを 14 に揃える。
--    x=15 に立っているダンサーがいた場合はステージ外になってしまうため、
--    先に 14 へ寄せてから幅を変える(アプリ側のclampと同じ考え方)。
update public.positions
set x_coordinate = 14
where x_coordinate > 14
  and scene_id in (
    select scenes.id
    from public.scenes
    join public.projects on projects.id = scenes.project_id
    where projects.stage_width = 15
  );

update public.projects set stage_width = 14 where stage_width = 15;


notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ
-- =========================================================================

-- 3-1. 既定値が 14 になったか
select column_name, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'projects'
  and column_name = 'stage_width';

-- 3-2. 幅15のプロジェクトが残っていないか(0件になれば成功)
select count(*) as remaining_width_15
from public.projects
where stage_width = 15;

-- 3-3. ステージ外に出ているダンサーがいないか(0件になれば成功)
select count(*) as out_of_bounds
from public.positions
join public.scenes on scenes.id = positions.scene_id
join public.projects on projects.id = scenes.project_id
where positions.x_coordinate > projects.stage_width
   or positions.y_coordinate > projects.stage_height;
