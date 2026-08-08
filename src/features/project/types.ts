export type Project = {
  id: string;
  userId: string;
  title: string;
  stageWidth: number;
  stageHeight: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * 一覧のカードに出すための、プロジェクトの中身の要約。
 *
 * エディタを開かなくても「どのくらい作り込んであるか」が分かるようにする。
 * タイトルだけが並ぶ一覧では、どれがどれだか思い出すのに毎回開く必要があった。
 */
export type ProjectSummary = Project & {
  sceneCount: number;
  dancerCount: number;
  /** 通しで再生したときの合計秒数(先頭シーンぶんは含まない) */
  totalSeconds: number;
  /** ダンサーの色。カードのドット列に使う(登録順) */
  dancerColors: string[];
  /** 先頭シーンの配置。カードのサムネイルに描く */
  firstScenePositions: { xCoordinate: number; yCoordinate: number; color: string }[];
};
