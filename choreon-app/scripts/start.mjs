import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';

/**
 * 開発サーバーを、**実機から届く住所で**立てる。
 *
 * ■ なぜ要るか
 * `npx expo start` をそのまま叩くと、この PC では自分の住所を
 * `127.0.0.1` として配ってしまう（Expo が LAN のアドレスを掴み損ねる。
 * Windows で起きることがある）。QR にもその住所が載るので、**スマホは
 * 自分自身に繋ごうとして必ず失敗する**。Wi-Fi もコードも悪くないのに
 * 「QRを読んでも繋がらない」になる、いちばん分かりにくい詰まり方。
 *
 * ■ 決め打ちにしない
 * `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.8` と書いてしまうと、
 * ルーターが別の番号を振った日に同じ症状へ戻る。**毎回その場で見つける。**
 *
 * ■ 選び方
 * IPv4 で、内側向け（127.x や 169.254.x でないもの）。仮想の口
 * （VirtualBox・WSL・VPN）が混ざると外れを掴むので、
 * **192.168.x / 10.x / 172.16〜31.x** の順で見て、いちばん普通の
 * 家庭内アドレスを優先する。
 *
 *   npm start
 */

/** 家庭やオフィスの Wi-Fi でいちばんよく使われる順 */
const PREFERRED = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

function findLanAddress() {
  const candidates = [];
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      if (address.address.startsWith('169.254.')) continue; // 相手のいない自動割当
      candidates.push({ name, ip: address.address });
    }
  }
  if (candidates.length === 0) return null;

  for (const pattern of PREFERRED) {
    const hit = candidates.find((candidate) => pattern.test(candidate.ip));
    if (hit) return hit;
  }
  return candidates[0];
}

const found = findLanAddress();

if (found) {
  console.log(`スマホから見たこの PC の住所: ${found.ip}（${found.name}）`);
  console.log('QR はこの住所を指します。スマホは同じ Wi-Fi につないでください。\n');
} else {
  console.log('LAN の住所が見つかりませんでした。Wi-Fi につながっていますか。');
  console.log('繋がらないときは `npx expo start --tunnel` を試してください。\n');
}

const child = spawn(
  'npx',
  ['expo', 'start', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    // Windows では npx は .cmd なので、シェル越しでないと起動できない
    // （そのまま spawn すると EINVAL になる）
    shell: true,
    env: found
      ? { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: found.ip }
      : process.env,
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
