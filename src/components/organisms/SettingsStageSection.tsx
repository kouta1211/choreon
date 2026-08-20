"use client";

import {
  SettingsGroup,
  SettingsNumberRow,
} from "@/components/molecules/SettingsRow";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateStageSize } from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  MAX_STAGE_UNITS,
  MIN_STAGE_UNITS,
} from "@/features/settings/lib/settings";
import { upsertPositions } from "@/features/scene/api/positions";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import {
  clampPositionsToStage,
  smallestStage,
} from "@/features/project/lib/stageResize";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「舞台」。客席の向きと、ステージの広さ。
 *
 * ■ 広さが指す先は、どこから開いたかで変わる(2026-08-18、実機報告 03-17)
 * ホームから開いたら【これから作る作品の初期値】、作品を開いた状態なら
 * 【その作品の広さ】。以前は2つの束に分けて両方見せていたが、
 * **同じ画面に「幅」が2つ並ぶ**ことになり、どちらが効くのか読めなかった。
 * いま見ている作品の広さを変えたい人にとって、初期値の欄はただの罠になる。
 *
 * 束ごとに部品を分けて、**その束が要る値だけをストアから読む**。
 * 親(SettingsSheet)がまとめて読んで配ると、設定を1つ変えるだけで
 * シート全体が描き直される。
 */
/**
 * 設定の「舞台」。**作品を開いているときだけ出る**（その作品の広さ）。
 *
 * ■ 初期値の束は廃した(2026-08-20)
 * 以前はホームから開くと「これから作る作品の初期値」を編集できたが、
 * **作るときの板でその場で広さを決められる**ようになったので、別の画面に
 * 初期値を置いておく意味が無くなった。出発点は定数
 * （`DEFAULT_STAGE_WIDTH` / `DEFAULT_STAGE_HEIGHT`）が持つ。
 *
 * ■ 客席の向きは「表示」へ移した
 * あれは作品の性質ではなく**この端末の見せ方**で、名前・導線・バミリと
 * 同じ仲間。ここに残すと、束の名前（舞台＝この作品）と中身がずれる。
 */
export function SettingsStageSection() {
  return <ProjectStage />;
}

/**
 * 作品を開いているとき。広さは**その作品のもの**で、変えるとステージが
 * その場で広がる（縮む）。
 *
 * ■ 狭めて人が外に出るときは、端へ寄せる（2026-08-18、実機報告 03-6）
 * 以前は「◯人がその外に居ます」と言って**広さの変更そのものを断って**いた。
 * 組んだ隊形を勝手に崩さないための作りだったが、
 * **「ステージの大きさを変更することを優先し、収まらない人はいちばん近い端に
 * 置く」**という判断になった。
 *
 * 崩れたままにしないための逃げ道は**元に戻す**。寄せた人とステージの広さを
 * ひと組で履歴へ積んであるので、1回押せば両方まとめて戻る。
 * 何人動いたかはトーストで言う（黙って隊形を変えない）。
 */
function ProjectStage() {
  const t = useT();
  const project = useProjectStore((state) => state.project);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const setStageSize = useProjectStore((state) => state.setStageSize);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const showToast = useUIStore((state) => state.showToast);

  if (!project) return null;

  const floor = smallestStage(positionsBySceneId);

  /**
   * 片方の軸だけを差し替えて確定する。
   *
   * **その場の値を読み直している。** 幅と奥行きの両方を打ってから下の
   * 「適用」を押すと、2つの確定が同じ瞬間に走る。描画したときの写しを
   * 見ていると、後から走った方が先の変更を消してしまう。
   */
  const apply = (next: { width?: number; height?: number }) => {
    const store = useProjectStore.getState();
    const current = store.project;
    if (!current) return;

    const width = next.width ?? current.stageWidth;
    const height = next.height ?? current.stageHeight;
    const before = { width: current.stageWidth, height: current.stageHeight };

    // 収まらない人を端へ寄せる。返るのは**動く人だけ**
    const changes = clampPositionsToStage(
      store.positionsBySceneId,
      width,
      height,
    );

    const draw = (to: "before" | "after") => {
      for (const change of changes) {
        updateDancerPosition(change.sceneId, change.dancerId, change[to]);
      }
    };

    setStageSize(width, height);
    draw("after");

    void (async () => {
      try {
        await persist((supabase) =>
          updateStageSize(supabase, current.id, width, height),
        );
        if (changes.length > 0) {
          await persist((supabase) =>
            upsertPositions(
              supabase,
              changes.map((change) => change.after),
            ),
          );
        }

        /* 成功してから履歴に積む。失敗した操作は見た目も戻っているので、
           積むと「元に戻す」の辻褄が合わなくなる(usePositionCommit と同じ) */
        useHistoryStore.getState().push({
          kind: "resize",
          stageSize: { before, after: { width, height } },
          changes,
        });

        if (changes.length > 0) {
          const moved = new Set(changes.map((change) => change.dancerId)).size;
          showToast({
            message: t.settings.projectStage.moved(moved),
            type: "warning",
          });
        }
      } catch (caught) {
        /* 楽観的に見せたぶんを戻す。保存できていないのに広く見えるのが最悪。
           広さは**この呼び出しが触った軸だけ**戻す(もう片方は別の書き込みの
           結果)。寄せた人は、この操作で動いたぶんだけ戻す */
        const now = useProjectStore.getState().project;
        if (now) {
          setStageSize(
            next.width === undefined ? now.stageWidth : before.width,
            next.height === undefined ? now.stageHeight : before.height,
          );
        }
        draw("before");
        showToast({
          message: toUserMessage(caught, t.settings.projectStage.failed),
          type: "error",
        });
      }
    })();
  };

  return (
    <SettingsGroup
      description={
        floor
          ? t.settings.projectStage.floor(floor.width, floor.height)
          : t.settings.projectStage.description
      }
    >
      <SettingsNumberRow
        label={t.settings.stage.width}
        value={project.stageWidth}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => apply({ width: value })}
      />
      <SettingsNumberRow
        label={t.settings.stage.depth}
        value={project.stageHeight}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => apply({ height: value })}
      />
    </SettingsGroup>
  );
}
