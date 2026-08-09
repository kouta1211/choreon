type Props = {
  /** ステージの横幅(ユニット数) */
  widthUnits: number;
  /** ステージの縦幅(ユニット数) */
  heightUnits: number;
};

/** 中心から引く放射線の角度。0/45/90/135で8方向ぶんになる(線は中心を貫くため) */
const SPOKE_ANGLES = [0, 45, 90, 135];

/**
 * 中心からの「距離」と「角度」でステージを読むための目盛り。格子の代わりに敷く。
 *
 * 円や弧の隊形を組むとき、直交する格子は数えにくい。中心から何マスめの輪に
 * 誰がいるか、どの方向へ開いているかで捉えられるようにする。
 *
 * SVGのviewBoxをステージのユニット数そのものにしてあるので、中の座標は
 * すべてマス目単位で書ける。ステージは常に `aspectRatio: 横/縦` で描かれ、
 * viewBoxと同じ比なので、引き伸ばしは起きず円は真円のままになる。
 *
 * 輪の間隔は格子と同じ1マス(約90cm)。比率で3本に決め打つ方法もあるが、
 * それだとステージの広さで1本の意味が変わってしまい、「何マスめ」と
 * 読めなくなる。線の太さはvectorEffectで拡大率から切り離し、
 * ステージが大きくなっても1pxの細さを保つ。
 */
export function ConcentricGuides({ widthUnits, heightUnits }: Props) {
  const centerX = widthUnits / 2;
  const centerY = heightUnits / 2;
  // 上下の縁までに収まる輪だけを、中心から1マスごとに引く
  const ringCount = Math.floor(heightUnits / 2);
  const radii = Array.from({ length: ringCount }, (_, index) => index + 1);

  return (
    <svg
      data-testid="stage-concentric"
      aria-hidden
      viewBox={`0 0 ${widthUnits} ${heightUnits}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {/* 放射線。輪より先に描いて、交点では輪が上に来るようにする */}
      {SPOKE_ANGLES.map((angle) => (
        <line
          key={angle}
          x1={centerX - widthUnits}
          y1={centerY}
          x2={centerX + widthUnits}
          y2={centerY}
          transform={`rotate(${angle} ${centerX} ${centerY})`}
          stroke="var(--text)"
          strokeOpacity={0.05}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {radii.map((radius) => (
        <circle
          key={radius}
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={0.16}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* 中心。左右対称の軸でもある。半径はユニット系の値なので、
          広いステージでも点のまま見えるよう縦幅に対する比で決める */}
      <circle
        cx={centerX}
        cy={centerY}
        r={heightUnits * 0.015}
        fill="var(--accent)"
      />
    </svg>
  );
}
