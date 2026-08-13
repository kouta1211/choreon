import { ImageResponse } from "next/og";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

export const alt = "Choreon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * リンクを貼ったときに出る絵。
 *
 * ■ なぜ要るか
 * 共有リンクは、振付師がダンサーへ **チャットに貼って** 渡すもの。
 * 何も指定していないと、受け取る側には長いURLの文字列だけが並ぶ。
 * 稽古の直前に「これ何のリンクだっけ」と迷わせない。
 *
 * ■ 絵には日本語を入れない
 * ImageResponse の既定のフォントは日本語の字を持たないので、
 * ここに日本語を書くと豆腐(□)になる。フォントを埋め込む手もあるが、
 * 数MBを毎回読むことになる。
 * **文字はチャットアプリ側が描く** — 作品名や説明は openGraph.title /
 * description で渡し、この絵は【何のアプリか一目で分かる形】だけを持つ。
 *
 * ■ 作品ごとの絵にはしない
 * 共有リンクのトークンはクエリ(`?t=`)にあり、この規約のファイルからは
 * 受け取れない(params だけが渡る)。トークン無しに中身を出す道を
 * 作るわけにはいかないので、絵は全リンク共通にして、作品名は
 * ビューアの generateMetadata が文字として載せる。
 */
export default function OpengraphImage() {
  // 奥から手前へ 1・2・3 と広がる隊形。左右対称で、6人が等間隔に並ぶ。
  // 点をばらまくと「隊形」ではなく「散らばった丸」に見える
  const formation = [
    { x: 50, y: 20 },
    { x: 33, y: 45 },
    { x: 67, y: 45 },
    { x: 18, y: 72 },
    { x: 50, y: 72 },
    { x: 82, y: 72 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 88px",
          background: "#000000",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 14,
              color: "#f472b6",
              marginBottom: 18,
            }}
          >
            CHOREON
          </div>
          {/* 2行で収まる大きさ。折り返して3行になると、右のステージと
              高さが噛み合わなくなる */}
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2 }}>
            Dance formations,
          </div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2 }}>
            made on your phone.
          </div>
        </div>

        {/* ステージ。床の格子まで描くと、何を見る絵なのかが伝わる */}
        <div
          style={{
            display: "flex",
            position: "relative",
            flexShrink: 0,
            width: 420,
            height: 300,
            borderRadius: 24,
            background: "#0a0a0b",
            border: "1px solid rgba(255,255,255,0.18)",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        >
          {formation.map((dot, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: 42,
                height: 42,
                marginLeft: -21,
                marginTop: -21,
                borderRadius: "50%",
                background: DANCER_COLOR_PALETTE[index],
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
