/**
 * **その作品に曲があるか**を、3つの状態へ畳む。
 *
 * ■ なぜ2つの値が要るのか（2026-09-25）
 * 音源は**この端末にしか置いていない**（`musicStorage.ts`・IndexedDB）。
 * サーバーへ上げない方針なので、**ブラウザが変われば必ず消える**。
 * 一方、曲の【名前】は作品の一部として Supabase に残している
 * （`projects.music_title`）。だから
 *
 *   - 端末に音源がある      … 鳴らせる
 *   - 名前だけ残っている    … この作品は曲で組んであるが、ここでは鳴らせない
 *   - どちらも無い          … まだ曲を入れていない
 *
 * の3つが起こりうる。**真ん中を表す物が無かった**ので、曲のシートは
 * 「名前だけ残っている」を「まだ入れていない」と同じ顔で描いていた。
 * user の報告（2026-09-25）「以前、曲を導入していたが、新しく開くと
 * 曲が消えてる」は、別のブラウザで開いたときのこれ。
 * ホームのカードは `musicTitle` を読んでいるので曲名が出ており、
 * **同じ作品について2つの画面が違うことを言っていた。**
 *
 * ■ `hasMusic` とは別物。混ぜない
 * 再生・波形・コマの追加・メトロノームは、どれも
 * `useMusicStore.objectUrl !== null`（＝**この端末に音が有るか**）で
 * 判じている。あちらを「名前があるか」に変えると、**鳴らせないのに
 * 鳴らせるつもりの画面**になる。ここで作るのは**見せ方のための**状態で、
 * 読むのは曲のシートだけ。
 */

/** 作品と端末を突き合わせた、曲の在り方 */
export type TrackPresence =
  /** まだ曲を入れていない */
  | { kind: "none" }
  /** この端末に音源がある。鳴らせる */
  | { kind: "ready"; fileName: string }
  /** 作品は曲を覚えているが、この端末に音源が無い */
  | { kind: "missing"; fileName: string };

/**
 * 空白だけの名前は「無い」と見なす。
 *
 * `music_title` はただの text 列で、DB は中身を守ってくれない。
 * 空文字が入っていると、名前の出ない「missing」になって
 * **理由の書いていない注意書きだけが出る**。
 */
function named(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * @param deviceFileName この端末に控えてある音源の名前（`useMusicStore.fileName`）
 * @param rememberedTitle 作品が覚えている曲名（`project.musicTitle`）
 *
 * **端末の側を優先する。** いま鳴っているのはそちらで、
 * 名前の列の方が古いことがある（選び直した直後など）。
 */
export function trackPresence(
  deviceFileName: string | null,
  rememberedTitle: string | null,
): TrackPresence {
  const onDevice = named(deviceFileName);
  if (onDevice) return { kind: "ready", fileName: onDevice };

  const remembered = named(rememberedTitle);
  if (remembered) return { kind: "missing", fileName: remembered };

  return { kind: "none" };
}
