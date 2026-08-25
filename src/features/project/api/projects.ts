import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Project, ProjectSummary } from "@/features/project/types";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { totalSeconds } from "@/features/scene/lib/sceneTiming";
import { DEFAULT_BPM } from "@/features/music/lib/metronomePreference";
import {
  normalizePlacements,
  type Placement,
} from "@/features/music/lib/placement";
import { nextAvailableTitle } from "@/features/project/lib/projectTitle";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    stageWidth: row.stage_width,
    stageHeight: row.stage_height,
    // 頭出しの列を足す前のスキーマのままのDBには、この列がまだ無い。undefinedのまま
    // 通すと秒数の計算がNaNになり、曲を鳴らしていなくてもシーンの選択が
    // おかしくなる。既定値(0)はDB側のdefaultと同じなので、無ければ0に落とす
    musicOffsetSeconds: row.music_offset_seconds ?? 0,
    musicTitle: row.music_title ?? null,
    // 速さ・拍子を足す前のスキーマのままのDBには、この2つの列がまだ無い。
    // 既定値はDB側のdefaultと同じ
    bpm: row.bpm ?? DEFAULT_BPM,
    beatsPerBar: row.beats_per_bar ?? 4,
    // メトロノームの列を足す前のDBには無い。鳴らさない側へ落とす
    isMetronomeEnabled: row.is_metronome_enabled ?? false,
    // 拍→秒の写像。**壊れた値をここで弾く** — jsonb なので DB は中身を
    // 守らない。列がまだ無い DB では、その作品の bpm から作る
    musicPlacements: normalizePlacements(
      row.music_placements,
      row.bpm ?? DEFAULT_BPM,
    ),
    // 共有リンクを足す前のスキーマのままのDBには、この2つの列がまだ無い。
    // トークンが無ければ共有の口は出せないので null / false に落とす
    shareToken: row.share_token ?? null,
    isShared: row.is_shared ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 共有のオン/オフ。
 *
 * トークンは作品を作った時点から持っているので、ここで作りはしない。
 * オフに戻すと、配ってあるリンクは【全部その場で開けなくなる】
 * (トークンは残っているので、オンに戻せば同じリンクがまた通る)。
 */
export async function updateProjectSharing(
  supabase: SupabaseClient<Database>,
  projectId: string,
  isShared: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ is_shared: isShared })
    .eq("id", projectId);

  if (error) throw error;
}

/**
 * リンクを作り直す。前のリンクはその瞬間から開けなくなる。
 *
 * 配った相手を個別に外す仕組みは持たない。リンクを知っている人が見られる、
 * という以上の細かさは、稽古の連絡手段(グループの共有)と釣り合わないため。
 * 「もう見せたくない」ときは作り直すか、共有そのものをオフにする。
 *
 * 新しいトークンをアプリ側で作っているのは、DBの gen_random_uuid() を
 * update から呼べないため。uuid の作り方としては同じ強さ(乱数)。
 */
export async function rotateShareToken(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<string> {
  const shareToken = crypto.randomUUID();
  const { error } = await supabase
    .from("projects")
    .update({ share_token: shareToken })
    .eq("id", projectId);

  if (error) throw error;
  return shareToken;
}

/**
 * 曲の速さ(BPM)を保存する。
 *
 * 速さ・拍子を足す前のスキーマのままのDBでは列が無く、Supabaseが
 * 「そんな列は無い」(PGRST204)を返す。BPMは端末側の表示にもう反映されて
 * いるので、その1件だけは【黙って流す】。ここで例外にすると、
 * 古いスキーマのDBでスライダーを触るたびにエラーが出る。
 */
export async function updateProjectBpm(
  supabase: SupabaseClient<Database>,
  projectId: string,
  bpm: number,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ bpm })
    .eq("id", projectId);

  if (error && error.code !== "PGRST204") throw error;
}

/**
 * **拍→秒の写像**を保存する。BPMと同じく、列がまだ無いDBでは黙って流す。
 *
 * ここが変わると、シーンの拍はそのままでも**画面に出る秒が全部動く**
 * （曲へ載せ直したとき）。逆に BPM スライダーは秒を動かさない側で、
 * あちらは拍を数え直す（`placement.ts` の `regrid` / `restretch`）。
 */
export async function updateMusicPlacements(
  supabase: SupabaseClient<Database>,
  projectId: string,
  placements: Placement[],
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ music_placements: placements })
    .eq("id", projectId);

  if (error && error.code !== "PGRST204") throw error;
}

/**
 * 拍子を保存する。BPMと同じく、列がまだ無いDBでは黙って流す。
 *
 * 拍子だけを別に持つのは、稽古場で数える単位(8カウント)と拍子が
 * 別のものだから。8カウントは数え方で、拍子は曲の性質。4拍子以外の曲でも
 * 8つ数えることに変わりはないので、この値で決まるのは
 * 「どの拍を強く鳴らすか」と拍線の太さだけになる。
 */
export async function updateProjectBeatsPerBar(
  supabase: SupabaseClient<Database>,
  projectId: string,
  beatsPerBar: number,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ beats_per_bar: beatsPerBar })
    .eq("id", projectId);

  if (error && error.code !== "PGRST204") throw error;
}

/**
 * メトロノーム(クリック)を鳴らすかを保存する。
 *
 * **端末ではなく作品が持つ**(2026-08-18)。共有リンクで見る人にも
 * 振付師の設定を引き継ぐため。音源は共有しないが、クリックは BPM と
 * 拍子から合成できるので共有できる。
 *
 * 列がまだ無いDBでは PGRST204 になるが、他と同じく握り潰す
 * (鳴らす鳴らさないは、その端末では効いたまま次の読み込みで戻る)。
 */
export async function updateProjectMetronome(
  supabase: SupabaseClient<Database>,
  projectId: string,
  isMetronomeEnabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ is_metronome_enabled: isMetronomeEnabled })
    .eq("id", projectId);

  if (error && error.code !== "PGRST204") throw error;
}

/** 曲の開始オフセット(秒)を保存する。曲そのものは端末側にしか無いので、
 * ここで保存するのは「何秒目から始めるか」だけ */
/**
 * ステージの広さを変える。
 *
 * ■ 作ったあとでも変えられるようにした(2026-08-18、実機報告 03-10)
 * これまで `stage_width` / `stage_height` は**作るときにしか書いていなかった**。
 * 設定の「ステージの幅」は新しく作る作品の初期値で、開いている作品には
 * 効かない。**変えられない、という報告はそのとおりだった。**
 *
 * 狭めるときに外へ出る人が居ないかは、呼ぶ側が先に確かめる
 * (stageResize.ts)。ここは書くだけ。
 */
export async function updateStageSize(
  supabase: SupabaseClient<Database>,
  projectId: string,
  stageWidth: number,
  stageHeight: number,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ stage_width: stageWidth, stage_height: stageHeight })
    .eq("id", projectId);

  if (error) throw error;
}

/**
 * 選んでいる曲の名前を覚える。**音源は上げない**（方針は変えていない）。
 * 一覧のカードに「どの曲で組んだ作品か」を出すためだけの1列。
 */
export async function updateMusicTitle(
  supabase: SupabaseClient<Database>,
  projectId: string,
  musicTitle: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ music_title: musicTitle })
    .eq("id", projectId);

  if (error) throw error;
}

export async function updateMusicOffset(
  supabase: SupabaseClient<Database>,
  projectId: string,
  musicOffsetSeconds: number,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ music_offset_seconds: musicOffsetSeconds })
    .eq("id", projectId);

  if (error) throw error;
}

/**
 * 一覧のカードに出す要約つきでプロジェクトを取得する。
 *
 * クエリは2本で済ませている。1本目でプロジェクトと、その配下のシーン・
 * ダンサーを入れ子で取り、2本目で「各プロジェクトの先頭シーン」の配置だけを
 * まとめて取る。プロジェクトごとに問い合わせるとN+1になるため、
 * 先頭シーンのIDを集めてから1回で引いている。
 *
 * 合計秒数は先頭シーンのぶんを含めない(先頭には入ってくる元が無いため)。
 */
export async function listProjectSummaries(
  supabase: SupabaseClient<Database>,
): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "*, scenes(id, order_index, time_seconds), dancers(id, color, created_at)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  type Row = ProjectRow & {
    scenes: {
      id: string;
      order_index: number;
      time_seconds: number;
    }[];
    dancers: { id: string; color: string; created_at: string }[];
  };
  const rows = (data ?? []) as Row[];

  // 並び順の正は時刻。エディタ側(sortScenes)と同じ規則で並べないと、
  // カードのサムネイルが「先頭のシーン」ではなくなる
  const scenesByProject = rows.map((row) => ({
    projectId: row.id,
    scenes: [...(row.scenes ?? [])].sort(
      (a, b) => a.time_seconds - b.time_seconds || a.order_index - b.order_index,
    ),
  }));
  const firstSceneIds = scenesByProject
    .map((entry) => entry.scenes[0]?.id)
    .filter((id): id is string => id !== undefined);

  const positions =
    firstSceneIds.length > 0
      ? await listPositionsByScenes(supabase, firstSceneIds)
      : [];
  const positionsBySceneId = new Map<string, typeof positions>();
  for (const position of positions) {
    const list = positionsBySceneId.get(position.sceneId) ?? [];
    list.push(position);
    positionsBySceneId.set(position.sceneId, list);
  }

  return rows.map((row, index) => {
    const scenes = scenesByProject[index].scenes;
    const dancers = [...(row.dancers ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const colorByDancerId = new Map(dancers.map((d) => [d.id, d.color]));
    const firstScenePositions = (
      positionsBySceneId.get(scenes[0]?.id ?? "") ?? []
    ).flatMap((position) => {
      const color = colorByDancerId.get(position.dancerId);
      if (!color) return [];
      return [
        {
          xCoordinate: position.xCoordinate,
          yCoordinate: position.yCoordinate,
          color,
        },
      ];
    });

    // 作品の長さは【先頭から最後のシーンまで】。
    // 以前は transition_duration_seconds(前のシーンから来るのに何秒か)を
    // 足し上げていたが、時刻が正になった今この列はもう更新されない。
    // 足し上げたままだと、追加したシーンがすべて既定値(1秒)で数えられ、
    // 一覧のカードだけが実際と違う長さを出すことになる
    const total = totalSeconds(
      scenes.map((scene) => ({ id: scene.id, timeSeconds: scene.time_seconds })),
    );

    return {
      ...toProject(row),
      sceneCount: scenes.length,
      dancerCount: dancers.length,
      totalSeconds: Math.round(total * 10) / 10,
      dancerColors: dancers.map((dancer) => dancer.color),
      firstScenePositions,
    };
  });
}

/**
 * 1件取ってくる。見えなければ null。
 *
 * ■ 「権限が無い」も null として扱う
 * ログインしていない相手には、RLS で行が絞られる前に GRANT の段で
 * 弾かれ、42501(insufficient_privilege)の例外になる。これをそのまま
 * 投げると、404 で済むはずのところが 500 になる。500 は
 * 「その先に何かある」ことを教えてしまううえ、画面にもエラーが出る。
 *
 * 呼び出し側から見れば「見えない」ことに変わりはないので、
 * どちらも null にして notFound() へ落とす。
 */
export async function getProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return null;
    throw error;
  }
  return data ? toProject(data) : null;
}

export async function updateProjectTitle(
  supabase: SupabaseClient<Database>,
  projectId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ title })
    .eq("id", projectId);

  if (error) throw error;
}

/**
 * dancers / scenes / positions は projects への外部キーが
 * `on delete cascade` なので、この1回の削除で関連データもまとめて消える
 * (アプリ側で順番に消して回る必要はない)
 */
export async function deleteProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}

/**
 * 既に手元にあるプロジェクト(ゲストの下書き)をそのまま登録する。
 *
 * createProjectと違ってidとステージの広さも指定する。下書きの側で
 * 既にそれらが決まっていて、シーン・ダンサーもそのidを参照しているため
 */
export async function insertProject(
  supabase: SupabaseClient<Database>,
  project: Project,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: project.id,
      user_id: project.userId,
      title: project.title,
      stage_width: project.stageWidth,
      stage_height: project.stageHeight,
      // 頭出しが既定(0)のままなら、この列を送らない。DB側のdefaultも0なので
      // 保存される値は変わらず、頭出しの列が無い古いDBでも
      // 下書きの保存が通る。頭出しを設定した下書きを保存する場合だけは
      // 列が要るので、そのときは素直に送って失敗させる
      // (黙って捨てると、設定したはずの位置が次に開いたとき消えている)
      ...(project.musicOffsetSeconds > 0
        ? { music_offset_seconds: project.musicOffsetSeconds }
        : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return toProject(data);
}

/**
 * その人の作品の名前だけを読む。ぶつからない名前を決めるためにだけ使う
 * (一覧の描画には listProjectSummaries を使う。あちらはシーンまで引く)。
 */
export async function listProjectTitles(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("title")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.title);
}

/**
 * 新しい作品を作る。
 *
 * ステージの広さと速さは【設定の初期値】を受け取る。作品が持つ値なので
 * 一度作ったあとは作品側が正で、設定を変えても既存の作品は動かない。
 *
 * 同じ名前が既にあれば (2)、(3) … と番号を足す(nextAvailableTitle)。
 * 付いた番号は返り値の title に入っているので、呼び出し側はそれを見て
 * 「名前を変えた」と伝えられる。
 */
export async function createProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  title: string,
  defaults?: { stageWidth: number; stageHeight: number; bpm: number },
): Promise<Project> {
  const uniqueTitle = nextAvailableTitle(
    await listProjectTitles(supabase, userId),
    title,
  );

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title: uniqueTitle,
      ...(defaults
        ? {
            stage_width: defaults.stageWidth,
            stage_height: defaults.stageHeight,
            bpm: defaults.bpm,
          }
        : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return toProject(data);
}
