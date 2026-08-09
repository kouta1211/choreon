import {
  DEFAULT_THEME,
  DEFAULT_TEXTURE,
  isThemeId,
  isTextureId,
  type ThemeId,
  type TextureId,
} from "@/features/theme/catalog";

/** localStorageのキー。値の形を変えるときはここも変えて、古い形を無視させる */
export const THEME_STORAGE_KEY = "choreon.appearance.v1";

/** 1つの見た目の選択(テーマ＋背景の質感) */
export type Appearance = { theme: ThemeId; texture: TextureId };

/**
 * 端末に保存している見た目。
 *
 * 既定はこの端末で共通。プロジェクトごとに違う見た目にしたい場合だけ
 * `byProject` に入る(詳細シートのトグル)。全プロジェクトぶんを常に持つと
 * 消したプロジェクトの分が残り続けるため、上書きしたものだけを持つ。
 */
export type ThemePreference = Appearance & {
  byProject: Record<string, Appearance>;
};

export const DEFAULT_PREFERENCE: ThemePreference = {
  theme: DEFAULT_THEME,
  texture: DEFAULT_TEXTURE,
  byProject: {},
};

/**
 * 保存されている文字列を読む。
 *
 * localStorageの中身は書き換えられる可能性がある外部入力なので、
 * 知っているidだけを通し、それ以外は既定に落とす。壊れたJSONで
 * 画面が真っ白になる方が、見た目が既定に戻るよりずっと困る。
 */
export function parsePreference(raw: string | null): ThemePreference {
  if (!raw) return DEFAULT_PREFERENCE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCE;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCE;

  const record = parsed as Record<string, unknown>;
  const byProject: Record<string, Appearance> = {};
  const rawByProject = record.byProject;
  if (typeof rawByProject === "object" && rawByProject !== null) {
    for (const [projectId, value] of Object.entries(
      rawByProject as Record<string, unknown>,
    )) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Record<string, unknown>;
      if (!isThemeId(entry.theme)) continue;
      byProject[projectId] = {
        theme: entry.theme,
        texture: isTextureId(entry.texture) ? entry.texture : DEFAULT_TEXTURE,
      };
    }
  }

  return {
    theme: isThemeId(record.theme) ? record.theme : DEFAULT_THEME,
    texture: isTextureId(record.texture) ? record.texture : DEFAULT_TEXTURE,
    byProject,
  };
}

/**
 * いまの画面に当てる見た目を決める。
 *
 * プロジェクトを開いていて、そのプロジェクトに上書きがあればそれ。
 * 無ければ端末の既定。
 */
export function resolveAppearance(
  preference: ThemePreference,
  projectId: string | null,
): Appearance {
  const override = projectId ? preference.byProject[projectId] : undefined;
  return override ?? { theme: preference.theme, texture: preference.texture };
}

/**
 * URLのパスから、開いているプロジェクトのidを取り出す。
 *
 * ちらつき防止のインラインスクリプトは、Reactが動く前に走るので
 * ルーターを使えない。同じ判定をアプリ側でも使えるよう関数にしてある。
 */
export function projectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
