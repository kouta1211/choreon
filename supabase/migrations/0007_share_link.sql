-- =========================================================================
-- 0007: 作品を「リンクを知っている人だけ」に見せられるようにする
-- =========================================================================
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】(if not exists / create or replace)。
--
-- ■ 何のための変更か
--   閲覧専用ビューア /view/[id] は「ダンサーが稽古場で見る画面」として
--   作ったが、RLS が auth.uid() = user_id なので、いま開けるのは
--   【作品の持ち主だけ】だった。見せたい相手に見せられない状態。
--
-- ■ なぜ anon にテーブルの権限を渡さないのか
--   個人データの方針(anonには一切権限を持たせない)は崩さない。
--   代わりに【トークンを受け取る関数を1つだけ】anon に開放する。
--   関数の中で「共有がオンで、トークンが一致する作品」だけを返すので、
--   テーブルそのものは閉じたままにできる。
--
--   security definer は「関数を作った人(postgres)の権限で動く」という
--   指定で、これがないと関数の中でも RLS に弾かれる。危ないのは
--   【引数の検査を忘れたとき】なので、where 句でトークンと is_shared を
--   必ず見ること。search_path も固定して、同名の関数へすり替えられない
--   ようにする。
--
-- ■ トークンの形
--   uuid(v4)。推測で当てられる長さではない。リンクを配り直したいときは
--   作り直す(アプリの「リンクを作り直す」がこれをやる)。
-- =========================================================================


alter table public.projects
  add column if not exists share_token uuid not null default gen_random_uuid();

-- 共有そのもののオン/オフ。トークンは常に持っているが、
-- これがfalseの間はどのリンクでも開けない
alter table public.projects
  add column if not exists is_shared boolean not null default false;

-- トークンから作品を引く。重複も防ぐ
create unique index if not exists projects_share_token_key
  on public.projects (share_token);


-- =========================================================================
-- 7-1. 共有された作品を1回で返す関数
-- =========================================================================
-- 返すのは表示に要るものだけ。share_token(合鍵そのもの)と
-- user_id(持ち主が誰か)は【返さない】。
create or replace function public.shared_project(token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
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

-- 既定では誰でも実行できてしまうので、一度剥がしてから配り直す
revoke all on function public.shared_project(uuid) from public;
grant execute on function public.shared_project(uuid) to anon, authenticated;


notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ
-- =========================================================================

-- 7-2. 列が追加されたか
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'projects'
  and column_name in ('share_token', 'is_shared');

-- 7-3. GRANTの確認。
--      projects は個人データなので、anon に権限が付いていてはいけない。
--      **この変更でも付けていない**(開放したのは関数の実行権だけ)。
--      anon の行が出たら剥奪する:
--        revoke all on public.projects from anon;
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('projects', 'dancers', 'scenes', 'positions')
  and grantee = 'anon';

-- 7-4. 関数の実行権。anon と authenticated だけに EXECUTE が付いていること
select r.routine_name, p.grantee, p.privilege_type
from information_schema.routine_privileges p
join information_schema.routines r
  on r.specific_name = p.specific_name
where r.routine_schema = 'public'
  and r.routine_name = 'shared_project';

-- 7-5. RLSポリシーの確認。列を足しただけなのでポリシーは変わらない
--      (共有は関数側で判定していて、テーブルは閉じたまま)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'projects';

-- 7-6. 動作確認。共有をオンにした作品のトークンで叩くと中身が返り、
--      オフの作品や当てずっぽうのトークンでは null が返る
-- select public.shared_project('<ここに share_token>');
