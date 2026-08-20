export type Project = {
  id: string;
  userId: string;
  title: string;
  stageWidth: number;
  stageHeight: number;
  /** 曲の何秒目からこの作品が始まるか。振付は曲の頭ではなくイントロの
   * 後から始まることが多いので、その頭出しの位置を覚えておく。
   * 音源そのものは保存していない(開くたびに端末のファイルを選ぶ) */
  musicOffsetSeconds: number;
  /** 選んでいる曲の名前。**音源そのものは端末にしか無い**ので、
   * 別の端末で開くと「名前は分かるが鳴らない」ことがある */
  musicTitle: string | null;
  /** 曲の速さ。曲を入れずにカウントで組むときの物差しになる。
   * 端末ではなく作品が持つ — 共有された相手の画面(閲覧専用ビューア)にも
   * 出せる時間の手がかりが、シーンの時刻とこれしか無いため */
  bpm: number;
  /** 拍子。メトロノームの強拍を決めるためだけに使う。
   * 稽古場で数える単位は8カウントで、拍子とは別 */
  beatsPerBar: number;
  /** メトロノーム(クリック)を鳴らすか。
   * **端末ではなく作品が持つ**(2026-08-18)。以前は端末ごとの設定だったが、
   * それだと共有リンクで見る人へ引き継げず、「振付師が決めたとおりに
   * 見える」が成り立たなかった。音源は共有しないが、クリックは BPM と
   * 拍子から合成できるので共有できる */
  isMetronomeEnabled: boolean;
  /**
   * 共有リンクの合鍵。**持ち主の画面にしか入らない**
   * (共有リンクで開いた人には返さない。合鍵をそのまま配ることになるため)。
   * リンクを配り直したいときは作り直す = ここを新しい値に書き換える。
   */
  shareToken: string | null;
  /** リンクを知っている人が見られる状態か。トークンは常に持っているが、
   * これがfalseの間はどのリンクでも開けない */
  isShared: boolean;
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
  firstScenePositions: {
    xCoordinate: number;
    yCoordinate: number;
    color: string;
  }[];
};
