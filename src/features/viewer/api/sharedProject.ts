import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import {
  beatAtSeconds,
  durationBeats,
  normalizePlacements,
  withDerivedTimes,
} from "@/features/music/lib/placement";
import { DEFAULT_BPM } from "@/features/music/lib/metronomePreference";

/**
 * 共有リンクで開いた人のための読み取り口。
 *
 * ■ なぜ普通のテーブル問い合わせではないのか
 * 4つのテーブルはすべて「自分の作品だけ」のRLSで閉じていて、ログインして
 * いない相手には権限の段で弾かれる。かといって anon にテーブルの権限を
 * 渡すと、【全員の作品】が読める口を開けることになる。
 *
 * そこで、トークンを受け取る関数を1つだけ開放している
 * (public.shared_project / schema.sql)。共有がオンで、トークンが
 * 一致する作品だけを返す関数で、テーブルそのものは閉じたまま。
 *
 * ■ 1回で全部返してもらう
 * 作品・ダンサー・シーン・配置を別々に引くと、そのたびに同じトークンの
 * 検査をやり直すことになる。関数側で jsonb にまとめて1往復にしている。
 */

/** 関数が返す形。DBの列名(スネークケース)のまま来る */
type SharedPayload = {
  project: {
    id: string;
    title: string;
    stage_width: number;
    stage_height: number;
    music_offset_seconds: number;
    /** 新しい関数はこちらを返す（曲の名前そのものは返さない） */
    has_music?: boolean;
    /** 関数を入れ替える前の環境から来る形。名前は使わず、有無だけ見る */
    music_title?: string | null;
    bpm?: number;
    beats_per_bar?: number;
    is_metronome_enabled?: boolean;
    /** 拍→秒の写像。関数を入れ替える前の環境からは来ない */
    music_placements?: unknown;
    created_at: string;
    updated_at: string;
  };
  dancers: {
    id: string;
    project_id: string;
    name: string;
    color: string;
    initial_direction: number;
    created_at: string;
  }[];
  scenes: {
    id: string;
    project_id: string;
    name: string;
    order_index: number;
    /** 古い環境からしか来ない。**正は position_beats** */
    time_seconds?: number;
    move_seconds?: number | null;
    position_beats?: number | null;
    move_beats?: number | null;
  }[];
  positions: {
    scene_id: string;
    dancer_id: string;
    x_coordinate: number;
    y_coordinate: number;
    rotation_angle: number;
    dancer_transition_duration_seconds: number | null;
    curve_control_x: number | null;
    curve_control_y: number | null;
  }[];
};

export type SharedProject = {
  project: Project;
  /** 曲に合わせて組まれた作品か。**曲の名前は渡らない**（上のコメント） */
  hasMusic: boolean;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
};

/** トークンの形をしていないものは、問い合わせる前に落とす。
 * uuid でない文字列を関数へ渡すと、Postgres 側の型変換で例外になる */
export function isShareToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function getSharedProject(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<SharedProject | null> {
  if (!isShareToken(token)) return null;

  const { data, error } = await supabase.rpc("shared_project", { token });

  // 関数がまだ無いDB(スキーマが古い)でも、画面は404で静かに閉じる。
  // ここで例外にすると、共有していない作品を開いたときとの区別が
  // 外から付いてしまう
  if (error) return null;

  const payload = data as SharedPayload | null;
  if (!payload?.project) return null;

  /* 拍→秒の写像。関数を入れ替える前の環境では来ないので、
     そのときは作品の bpm から作る（門番も兼ねる） */
  const placements = normalizePlacements(
    payload.project.music_placements,
    payload.project.bpm ?? DEFAULT_BPM,
  );

  return {
    project: {
      id: payload.project.id,
      // 持ち主が誰かは返ってこない。編集の口が無い画面なので、
      // 使う場面も無い
      userId: "",
      title: payload.project.title,
      stageWidth: payload.project.stage_width,
      stageHeight: payload.project.stage_height,
      musicOffsetSeconds: payload.project.music_offset_seconds ?? 0,
      /* 見る側は曲の名前を受け取らない。有無だけを hasMusic で持つ */
      musicTitle: null,
      bpm: payload.project.bpm ?? DEFAULT_BPM,
      beatsPerBar: payload.project.beats_per_bar ?? 4,
      isMetronomeEnabled: payload.project.is_metronome_enabled ?? false,
      musicPlacements: placements,
      // 合鍵そのものは返さない(共有リンクで開いた人へ渡すと、
      // その人がリンクを作り直せてしまうわけではないが、配る必要が無い)
      shareToken: null,
      isShared: true,
      createdAt: payload.project.created_at,
      updatedAt: payload.project.updated_at,
    },
    /* 曲に合わせて組まれた作品か。**名前は見ない。**
       関数を入れ替える前の環境では has_music が来ないので、
       そのときだけ古い形（music_title）から読む */
    hasMusic:
      payload.project.has_music ?? payload.project.music_title != null,
    dancers: (payload.dancers ?? []).map((dancer) => ({
      id: dancer.id,
      projectId: dancer.project_id,
      name: dancer.name,
      color: dancer.color,
      initialDirection: dancer.initial_direction,
      createdAt: dancer.created_at,
    })),
    /* **秒は載せ方から導く。** 関数を入れ替える前の環境では拍が来ないので、
       そのときだけ秒から逆算する（画面が真っ白になるより、少し古い
       物差しで動く方がよい） */
    scenes: withDerivedTimes(
      (payload.scenes ?? []).map((scene) => ({
        id: scene.id,
        projectId: scene.project_id,
        name: scene.name,
        orderIndex: scene.order_index,
        positionBeats:
          scene.position_beats ??
          beatAtSeconds(placements, scene.time_seconds ?? 0),
        moveBeats:
          scene.move_beats ??
          (scene.move_seconds == null
            ? null
            : durationBeats(
                placements,
                scene.position_beats ??
                  beatAtSeconds(placements, scene.time_seconds ?? 0),
                scene.move_seconds,
              )),
      })),
      placements,
    ),
    positions: (payload.positions ?? []).map((position) => ({
      sceneId: position.scene_id,
      dancerId: position.dancer_id,
      xCoordinate: position.x_coordinate,
      yCoordinate: position.y_coordinate,
      rotationAngle: position.rotation_angle,
      curveControlX: position.curve_control_x,
      curveControlY: position.curve_control_y,
    })),
  };
}
