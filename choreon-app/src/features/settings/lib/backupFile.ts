import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * 書き出したJSONを**端末の外へ渡す**、そして**ファイルから読む**ところ。
 *
 * 中身の組み立てと検証は `backup.ts`（Web版からのコピー）が持つ。
 * ここが受け持つのは、**3つの出力先で作法が違う部分だけ**。
 *
 * - iOS / Android: いったんアプリの一時領域へ書いて、端末の共有シートへ渡す
 *   （AirDrop・メール・ファイルアプリなど、渡し先は端末が決める）
 * - Web: Blob を作ってダウンロードさせる。共有シートに当たるものが無い
 *
 * 分けてあるのは、**画面側にプラットフォーム分岐を持ち込まないため**。
 * 呼ぶ側は「書き出す」「読む」だけを知っていればよい。
 */

/** 書き出した結果。Web はダウンロード、ネイティブは共有シートへ渡す */
export type ExportResult = { kind: 'shared' } | { kind: 'downloaded'; fileName: string };

export async function exportBackupFile(
  fileName: string,
  json: string,
): Promise<ExportResult> {
  if (Platform.OS === 'web') {
    // ブラウザには共有シートが無いので、素直にダウンロードさせる
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    // すぐ revoke するとダウンロードが始まらない端末がある
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { kind: 'downloaded', fileName };
  }

  // アプリの一時領域へ置いてから渡す。**共有シートはURIしか受け取らない**。
  //
  // SDK 57 の expo-file-system は `File` / `Paths` のクラスで、
  // `cacheDirectory` と `writeAsStringAsync` は古い形（`/legacy` に移った）。
  // 新しい方で書いている — `create({ overwrite: true })` にしないと、
  // 同じ日に2回書き出したときに「もうある」で落ちる
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(json);
  const uri = file.uri;

  if (!(await Sharing.isAvailableAsync())) {
    // 共有が使えない端末では、一時領域に置いたところで止める。
    // 呼び出し側が「書き出せなかった」と伝える
    throw new Error('sharing unavailable');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: fileName,
    UTI: 'public.json',
  });
  return { kind: 'shared' };
}

/**
 * ファイルを1つ選ばせて、中身を文字列で返す。
 *
 * 選ばずに閉じたら `null`（**失敗ではない**。断りの知らせを出さない）。
 *
 * `copyToCacheDirectory: true` にしているのは、選んだ先が
 * クラウドや別アプリの領域だと、そのままでは読めないことがあるため
 * （music-picker と同じ理由）。
 */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  if (Platform.OS === 'web') {
    // Web では uri が blob: か data:。fetch で読めば中身が取れる
    const response = await fetch(asset.uri);
    return await response.text();
  }
  return await new File(asset.uri).text();
}
