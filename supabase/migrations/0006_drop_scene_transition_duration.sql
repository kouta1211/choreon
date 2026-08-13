-- =========================================================================
-- 0006: 使われなくなった scenes.transition_duration_seconds を落とす
-- =========================================================================
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】(if exists)。
--
-- ■ なぜ落とすのか
--   0004 で「シーンは曲の何秒目か」(time_seconds)を持つようになり、
--   移動にかかる時間は隣との差分から毎回求める形になった。
--   この列はその時点で読まれなくなり、【誰も書き込まなくなった】。
--
--   書かれない列が残っていると、次に見た人が「移動時間はここに入っている」
--   と読んでしまう。実際にはシーンを1つ足すたびに既定値(1秒)のまま増える
--   だけの数で、実際の振付とは何の関係も無い。事実として間違った値が
--   保存され続ける場所は、消すのがいちばん安全。
--
--   0004 は「backfill が正しく効いたことを確かめたうえで、しばらく様子を
--   見てから別のマイグレーションで落とす」と書いた。これがその後始末。
--
-- ■ 落とす前に確かめること(下の 6-0 を先に実行する)
--   time_seconds への移し替えが済んでいれば、各プロジェクトの時刻は
--   0 から始まって増えていく。全部 0 のプロジェクトがあるなら、
--   そこは 0004 の backfill が効いていない。**その場合は 0004 を先に流す**
--   (この列を落とすと、そのプロジェクトの時間の情報は戻せなくなる)。
-- =========================================================================


-- =========================================================================
-- 6-0. 【先に実行する】落として安全かの確認
-- =========================================================================
-- 期待する結果: 行が1つも返らないこと。
-- 返ってきたプロジェクトは、シーンが2つ以上あるのに時刻が全部0で、
-- 移し替えが済んでいない可能性がある
select
  project_id,
  count(*) as scene_count,
  max(time_seconds) as max_time_seconds
from public.scenes
group by project_id
having count(*) > 1 and max(time_seconds) = 0;


-- =========================================================================
-- 6-1. 列を落とす
-- =========================================================================
-- 制約は列と一緒に落ちるが、明示しておく(0001 で付けたもの)
alter table public.scenes
  drop constraint if exists scenes_transition_duration_seconds_check;

alter table public.scenes
  drop column if exists transition_duration_seconds;


notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ
-- =========================================================================

-- 6-2. 列が消えたか。scenes に残る列の一覧
--      (id / project_id / name / order_index / time_seconds / created_at)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'scenes'
order by ordinal_position;

-- 6-3. GRANTの確認。
--      scenes は個人データ(ユーザーごとに分離すべきもの)なので、
--      anon に権限が付いていてはいけない。anon の行が出たら剥奪する:
--        revoke all on public.scenes from anon;
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'scenes'
order by grantee, privilege_type;

-- 6-4. RLSポリシーの確認。列を落としただけなのでポリシーは変わらないが、
--      「自分の作品だけ」のポリシーがそのまま残っていることを確かめる
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'scenes';
