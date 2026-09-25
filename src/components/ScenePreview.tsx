import type { Cue, Fixture, Zone } from "../types";

interface Props {
  fixtures: Fixture[];
  cue: Cue;
  zoneFilter: Zone | "全部";
}

/** 各灯区在正视图中的光池位置与形状（viewBox 0 0 200 120） */
function poolGeometry(zone: Zone, index: number, total: number) {
  const spread = (i: number) => 30 + (i / Math.max(1, total - 1)) * 140;
  switch (zone) {
    case "面光":
      return { cx: spread(index), cy: 86, rx: 26, ry: 15 };
    case "逆光":
      return { cx: spread(index), cy: 30, rx: 22, ry: 22 };
    case "侧光":
      return { cx: index < total / 2 ? 18 : 182, cy: 34 + (index % 3) * 22, rx: 14, ry: 20 };
    case "效果光":
      return { cx: spread(index), cy: 74, rx: 18, ry: 14 };
  }
}

export default function ScenePreview({ fixtures, cue, zoneFilter }: Props) {
  const byZone = (z: Zone) =>
    fixtures
      .map((fx, i) => ({ fx, i }))
      .filter(({ fx }) => fx.zone === z);

  const renderZone = (z: Zone) =>
    byZone(z).map(({ fx, i }, zoneIndex) => {
      const group = byZone(z);
      const level = cue.states[fx.id]?.level ?? 0;
      const dim = zoneFilter !== "全部" && zoneFilter !== z;
      if (level === 0 || dim) return null;
      const g = poolGeometry(z, zoneIndex, group.length);
      return (
        <ellipse
          key={fx.id}
          cx={g.cx}
          cy={g.cy}
          rx={g.rx}
          ry={g.ry}
          fill={`url(#grad-${fx.id})`}
          opacity={level / 100}
        />
      );
    });

  const averageLevel =
    fixtures.reduce((sum, fx) => sum + (cue.states[fx.id]?.level ?? 0), 0) / Math.max(1, fixtures.length);

  return (
    <div className="stage-card">
      <div className="card-title">
        <h3>场景预览 · Cue {cue.id}</h3>
        <span className="card-hint">{cue.name} · 平均亮度 {Math.round(averageLevel)}%</span>
      </div>
      <svg viewBox="0 0 200 120" className="preview-svg" role="img" aria-label={`场景预览 Cue ${cue.id}`}>
        <defs>
          {fixtures.map((fx) => (
            <radialGradient key={fx.id} id={`grad-${fx.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={fx.gel} stopOpacity="0.95" />
              <stop offset="70%" stopColor={fx.gel} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fx.gel} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* 背景随整体亮度微亮 */}
        <rect x="0" y="0" width="200" height="120" fill="#070b16" />
        <rect
          x="0"
          y="0"
          width="200"
          height="120"
          fill="#fff7e6"
          opacity={averageLevel / 100 * 0.06}
        />

        {/* 天幕 */}
        <rect x="10" y="8" width="180" height="62" rx="2" fill="#0d1526" stroke="#233049" strokeWidth="0.5" />

        {/* 光池：逆光 → 效果 → 面光 → 侧光 的层叠顺序 */}
        {renderZone("逆光")}
        {renderZone("效果光")}
        {renderZone("面光")}
        {renderZone("侧光")}

        {/* 舞台地板 */}
        <rect x="0" y="100" width="200" height="20" fill="#141d31" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="#33415c" strokeWidth="0.6" />

        {/* 演员剪影 */}
        <g fill="#05080f" opacity={0.92}>
          <circle cx="88" cy="86" r="3.4" />
          <path d="M82 100 q6 -12 12 0 Z" />
          <circle cx="112" cy="85" r="3.1" />
          <path d="M106.5 100 q5.5 -11 11 0 Z" />
        </g>
      </svg>
    </div>
  );
}
