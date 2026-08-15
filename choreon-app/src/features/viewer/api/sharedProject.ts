import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { isShareToken } from "@/features/project/lib/shareLink";

/** 曲を入れていない作品の速さ。DBのdefaultと同じ（Web版は
 * metronomePreference が持っているが、ネイティブ版はまだ別置き） */
const DEFAULT_BPM = 120;

/**
 * 共有リンクで開いた人のための読み取り口。**Web版からの写し。**
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
    bpm?: number;
    beats_per_bar?: number;
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
    time_seconds: number;
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
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
};

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
      bpm: payload.project.bpm ?? DEFAULT_BPM,
      beatsPerBar: payload.project.beats_per_bar ?? 4,
      // 合鍵そのものは返さない(共有リンクで開いた人へ渡すと、
      // その人がリンクを作り直せてしまうわけではないが、配る必要が無い)
      shareToken: null,
      isShared: true,
      createdAt: payload.project.created_at,
      updatedAt: payload.project.updated_at,
    },
    dancers: (payload.dancers ?? []).map((dancer) => ({
      id: dancer.id,
      projectId: dancer.project_id,
      name: dancer.name,
      color: dancer.color,
      initialDirection: dancer.initial_direction,
      createdAt: dancer.created_at,
    })),
    scenes: (payload.scenes ?? []).map((scene) => ({
      id: scene.id,
      projectId: scene.project_id,
      name: scene.name,
      orderIndex: scene.order_index,
      timeSeconds: scene.time_seconds,
    })),
    positions: (payload.positions ?? []).map((position) => ({
      sceneId: position.scene_id,
      dancerId: position.dancer_id,
      xCoordinate: position.x_coordinate,
      yCoordinate: position.y_coordinate,
      rotationAngle: position.rotation_angle,
      dancerTransitionDurationSeconds:
        position.dancer_transition_duration_seconds,
      curveControlX: position.curve_control_x,
      curveControlY: position.curve_control_y,
    })),
  };
}
