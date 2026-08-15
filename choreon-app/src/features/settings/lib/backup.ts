import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

/**
 * 作品まるごとの持ち出しと取り込み。
 *
 * ■ 何のためにあるか
 * この作品は Supabase の1行として存在していて、アカウントを失うと
 * 一緒に消える。**振付は本番までに何十時間もかけて積み上げるもの**なので、
 * 手元にも置ける形が要る。JSONにしてあるのは、表計算にも貼れて、
 * 中身を目で読めるため。
 *
 * ■ 曲は入らない
 * 音源は端末から出さない方針で、そもそもサーバーにも無い。
 * 入っているのは「曲の何秒目から始めるか」だけ。
 *
 * ■ idは持ち出すが、取り込むときは作り直す
 * 同じ作品を2回取り込んだときに、後の1つが前の1つを上書きしてしまう。
 * 取り込みは常に【新しい作品として作る】ので、元が消えることはない。
 */

/** 形が変わったら上げる。古い版は読まずに断る */
export const BACKUP_VERSION = 1;

export type Backup = {
  version: number;
  /** 書き出した時刻(ISO)。人が見て新しい方を選ぶための情報 */
  exportedAt: string;
  project: Pick<
    Project,
    | "title"
    | "stageWidth"
    | "stageHeight"
    | "musicOffsetSeconds"
    | "bpm"
    | "beatsPerBar"
  >;
  dancers: Pick<Dancer, "id" | "name" | "color" | "initialDirection">[];
  scenes: Pick<Scene, "id" | "name" | "orderIndex" | "timeSeconds">[];
  positions: Position[];
};

export function buildBackup(input: {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
  exportedAt: string;
}): Backup {
  return {
    version: BACKUP_VERSION,
    exportedAt: input.exportedAt,
    project: {
      title: input.project.title,
      stageWidth: input.project.stageWidth,
      stageHeight: input.project.stageHeight,
      musicOffsetSeconds: input.project.musicOffsetSeconds,
      bpm: input.project.bpm,
      beatsPerBar: input.project.beatsPerBar,
    },
    dancers: input.dancers.map((dancer) => ({
      id: dancer.id,
      name: dancer.name,
      color: dancer.color,
      initialDirection: dancer.initialDirection,
    })),
    scenes: input.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      orderIndex: scene.orderIndex,
      timeSeconds: scene.timeSeconds,
    })),
    positions: input.positions,
  };
}

/** 読み取れなかった理由の文。言語ごとに変わるので、外から渡す */
export type BackupWords = {
  unreadableFile: string;
  wrongShape: string;
  wrongVersion: string;
  noProject: string;
  incomplete: string;
};

export class BackupFormatError extends Error {}

/**
 * 読み込んだ文字列を検証する。
 *
 * 取り込みは【他人が作ったファイル】を受け取る操作なので、
 * 形が合わないものは黙って直さず、その場で断る。半端に読み込むと、
 * 座標が欠けた作品ができて、どこが壊れているのか分からなくなる。
 */
export function parseBackup(raw: string, words: BackupWords): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupFormatError(words.unreadableFile);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new BackupFormatError(words.wrongShape);
  }

  const record = parsed as Record<string, unknown>;
  if (record.version !== BACKUP_VERSION) {
    throw new BackupFormatError(
      words.wrongVersion,
    );
  }

  const project = record.project as Backup["project"] | undefined;
  if (!project || typeof project.title !== "string") {
    throw new BackupFormatError(words.noProject);
  }
  if (
    !Array.isArray(record.dancers) ||
    !Array.isArray(record.scenes) ||
    !Array.isArray(record.positions)
  ) {
    throw new BackupFormatError(words.incomplete);
  }

  return {
    version: BACKUP_VERSION,
    exportedAt:
      typeof record.exportedAt === "string" ? record.exportedAt : "",
    project: {
      title: project.title,
      stageWidth: Number(project.stageWidth) || 14,
      stageHeight: Number(project.stageHeight) || 10,
      musicOffsetSeconds: Number(project.musicOffsetSeconds) || 0,
      bpm: Number(project.bpm) || 120,
      beatsPerBar: Number(project.beatsPerBar) || 4,
    },
    dancers: record.dancers as Backup["dancers"],
    scenes: record.scenes as Backup["scenes"],
    positions: record.positions as Position[],
  };
}

/** 保存するときのファイル名。作品名をそのまま使う */
export function backupFileName(title: string, exportedAt: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40)
    .trim();
  const day = exportedAt.slice(0, 10);
  return `${safe || "choreon"}-${day}.json`;
}
