-- =========================================================================
-- 0005: 作品に「速さ(BPM)」と「拍子」を持たせる
-- =========================================================================
-- 使い方: Supabaseダッシュボード > SQL Editor に貼り付けて実行する。
-- このファイルは【何度実行しても安全】(if not exists)。
--
-- 何のための列か:
--   曲を入れずにカウントで振付を組むとき、時間軸の地は波形ではなく
--   「8カウントの縞」になる。その縞を引くには BPM が要る。
--
--   これまで BPM は端末の localStorage にだけ置いていた。それだと
--   (a) 別の端末で開くと入れ直しになり
--   (b) 閲覧専用ビューアで見る人の画面では、そもそもカウントが引けない。
--
--   音源は共有しない方針(端末から出さない)なので、共有された相手の画面に
--   出せる時間の手がかりは「シーンの時刻」と「BPM」しか無い。
--   曲の開始位置(music_offset_seconds)と同じく、作品の一部として持つ。
--
-- 拍子(beats_per_bar)を分けて持つ理由:
--   稽古場で数える単位は小節ではなく【8カウント】で、それは拍子とは別。
--   ただし4拍子以外の曲もあるため、メトロノームの強拍だけはこの値で決める。
-- =========================================================================


alter table public.projects
  add column if not exists bpm numeric not null default 120;

alter table public.projects
  add column if not exists beats_per_bar integer not null default 4;

-- 拍を定義できない値を弾く。0以下だと1拍の長さが無限大になり、
-- 縞を引く処理が終わらなくなる
alter table public.projects
  drop constraint if exists projects_bpm_check;

alter table public.projects
  add constraint projects_bpm_check
  check (bpm::float8 >= 40 and bpm::float8 <= 240);

alter table public.projects
  drop constraint if exists projects_beats_per_bar_check;

alter table public.projects
  add constraint projects_beats_per_bar_check
  check (beats_per_bar >= 2 and beats_per_bar <= 12);


notify pgrst, 'reload schema';


-- =========================================================================
-- 適用後の確認クエリ
-- =========================================================================

-- 5-1. 列が追加されたか
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'projects'
  and column_name in ('bpm', 'beats_per_bar');

-- 5-2. GRANTの確認。
--      projects は個人データ(ユーザーごとに分離すべきもの)なので、
--      anon に権限が付いていてはいけない。anon の行が出たら剥奪する:
--        revoke all on public.projects from anon;
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'projects'
order by grantee, privilege_type;

-- 5-3. RLSポリシーの確認。
--      列を足しただけなのでポリシーは変わらないが、この列も
--      既存の「自分の作品だけ」のポリシー配下に入ることを確かめる
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'projects';
