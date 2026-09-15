import io, sys

def edit(path, pairs):
    src = io.open(path, encoding="utf-8", newline="").read()
    eol = "\r\n" if "\r\n" in src else "\n"
    for old, new in pairs:
        o = old.replace("\n", eol)
        n = src.count(o)
        if n != 1:
            sys.exit("%s NOT UNIQUE (%d): %r" % (path, n, old[:60]))
        src = src.replace(o, new.replace("\n", eol))
    io.open(path, "w", encoding="utf-8", newline="").write(src)
    print("ok", path)

edit("src/components/molecules/SceneRow.tsx", [
("""import {
  countLengthLabel,
} from "@/features/music/lib/counts";""",
"""import { countLengthLabel } from "@/features/music/lib/counts";
import { countLabelAtBeat } from "@/features/music/lib/countLabel";"""),
])

# 区切りの行は、そこが必ず 1-1 になる（数え直すので）。出しても情報にならない
edit("src/components/organisms/MusicSectionList.tsx", [
('import { BEATS_PER_SET, countLabelAtBeat } from "@/features/music/lib/counts";',
 'import { BEATS_PER_SET } from "@/features/music/lib/counts";'),
("""            <p className="font-mono text-mono-s text-fg-muted">
              {countLabelAtBeat(section.fromBeat)}
              {" · "}
              {t.music.sectionStart(formatMinutes(section.fromSeconds))}
            </p>""",
"""            {/* **カウントは出さない**（2026-09-15・第2段）。区切りごとに
                数え直すので、ここは必ず `1-1` になる。出しても情報が無い */}
            <p className="font-mono text-mono-s text-fg-muted">
              {t.music.sectionStart(formatMinutes(section.fromSeconds))}
            </p>"""),
])
