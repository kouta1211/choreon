"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import {
  SettingsActionRow,
  SettingsGroup,
} from "@/components/molecules/SettingsRow";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  onExport?: () => void;
  onImport?: () => void;
  onResetProject?: () => void;
};

/**
 * 設定の「データ」。作品の書き出し・取り込み・空にする。
 *
 * ここだけ molecules に置いてある。他の束は自分でストアを読むので
 * organisms だが、この3つは**呼び出し側の関数を押すだけ**でストアに触らない
 * (`components/README.md` の基準は「ストアに触るか」)。
 *
 * 渡されなかったものは出さない。作品を開いていないホームでは3つとも
 * 渡らないので、束そのものが一覧に出ない(SettingsSheet)。
 */
export function SettingsDataSection({
  onExport,
  onImport,
  onResetProject,
}: Props) {
  const t = useT();

  return (
    <SettingsGroup description={t.settings.data.description}>
      {onExport && (
        <SettingsActionRow
          label={t.settings.data.export.label}
          description={t.settings.data.export.description}
          icon={<Download size={20} />}
          onClick={onExport}
        />
      )}
      {onImport && (
        <SettingsActionRow
          label={t.settings.data.import}
          icon={<Upload size={20} />}
          onClick={onImport}
        />
      )}
      {onResetProject && (
        <SettingsActionRow
          label={t.settings.data.reset.label}
          description={t.settings.data.reset.description}
          icon={<RotateCcw size={20} />}
          isDangerous
          onClick={onResetProject}
        />
      )}
    </SettingsGroup>
  );
}
