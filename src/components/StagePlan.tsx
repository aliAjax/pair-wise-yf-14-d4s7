import type { Cue, Fixture, Zone } from "../types";

interface Props {
  fixtures: Fixture[];
  cue: Cue;
  zoneFilter: Zone | "全部";
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

function beamTarget(fx: Fixture): { x: number; y: number } {
  if (fx.y >= 80) return { x: fx.x, y: fx.y - 30 }; // 面光/前场效果光 → 向上
  if (fx.y <= 20) return { x: fx.x, y: fx.y + 30 }; // 逆光/后景效果光 → 向下
  if (fx.x <= 10) return { x: fx.x + 34, y: fx.y }; // 左侧光 → 向右
  return { x: fx.x - 34, y: fx.y }; // 右侧光 → 向左
}

function beamPoints(fx: Fixture): string {
  const t = beamTarget(fx);
  const dx = t.x - fx.x;
  const dy = t.y - fx.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const s = 1.1;
  const e = 5;
  return [
    `${fx.x + px * s},${fx.y + py * s}`,
    `${t.x + px * e},${t.y + py * e}`,
    `${t.x - px * e},${t.y - py * e}`,
    `${fx.x - px * s},${fx.y - py * s}`,
  ].join(" ");
}

export default function StagePlan({ fixtures, cue, zoneFilter, selectedIds, onToggleSelect }: Props) {
  return (
    <div className="stage-card">
      <div className="card-title">
        <h3>舞台平面灯位图</h3>
        <span className="card-hint">俯视 · 点击灯位可加选（筛选不会清掉选择）</span>
      </div>
      <svg viewBox="0 0 100 100" className="stage-svg" role="img" aria-label="舞台平面灯位图">
        {/* 观众席 */}
        <rect x="8" y="90" width="84" height="7" rx="1.2" fill="#1b2436" />
        <text x="50" y="95" textAnchor="middle" fontSize="3" fill="#8292ab">
          观众席
        </text>

        {/* 舞台区域 */}
        <rect x="8" y="12" width="84" height="76" rx="1.5" fill="#101a2e" stroke="#2c3a55" strokeWidth="0.5" />
        <line x1="50" y1="12" x2="50" y2="88" stroke="#21304a" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        <text x="11" y="17" fontSize="2.8" fill="#5d6f8c">后景区</text>
        <text x="11" y="86" fontSize="2.8" fill="#5d6f8c">台口</text>
        <text x="9.4" y="50" fontSize="2.8" fill="#5d6f8c" transform="rotate(-90 9.4 50)" textAnchor="middle">
          上场门
        </text>
        <text x="90.6" y="50" fontSize="2.8" fill="#5d6f8c" transform="rotate(90 90.6 50)" textAnchor="middle">
          下场门
        </text>

        {/* 光束 */}
        {fixtures.map((fx) => {
          const visible = zoneFilter === "全部" || fx.zone === zoneFilter;
          const level = cue.states[fx.id]?.level ?? 0;
          if (!visible || level === 0) return null;
          return (
            <polygon
              key={`beam-${fx.id}`}
              points={beamPoints(fx)}
              fill={fx.gel}
              opacity={0.07 + (level / 100) * 0.4}
            />
          );
        })}

        {/* 目标点 */}
        {fixtures.map((fx) => {
          const visible = zoneFilter === "全部" || fx.zone === zoneFilter;
          const level = cue.states[fx.id]?.level ?? 0;
          if (!visible || level === 0) return null;
          const t = beamTarget(fx);
          return <circle key={`t-${fx.id}`} cx={t.x} cy={t.y} r="0.7" fill={fx.gel} opacity={0.85} />;
        })}

        {/* 灯具 */}
        {fixtures.map((fx) => {
          const visible = zoneFilter === "全部" || fx.zone === zoneFilter;
          const level = cue.states[fx.id]?.level ?? 0;
          const selected = selectedIds.has(fx.id);
          const overridden = Boolean(cue.states[fx.id]?.focus);
          return (
            <g
              key={fx.id}
              className="fixture-marker"
              opacity={visible ? 1 : 0.14}
              onClick={() => onToggleSelect(fx.id)}
            >
              <title>{`${fx.id} · CH${fx.channel} · ${fx.zone} · ${fx.gelName} · ${level}%`}</title>
              {selected && <circle cx={fx.x} cy={fx.y} r="3.6" fill="none" stroke="#ffd166" strokeWidth="0.7" />}
              <circle
                cx={fx.x}
                cy={fx.y}
                r="2.4"
                fill={level > 0 ? fx.gel : "#5b6a85"}
                stroke={overridden ? "#f59e0b" : "#0a0f1c"}
                strokeWidth={overridden ? 0.6 : 0.4}
              />
              <text x={fx.x} y={fx.y <= 20 ? fx.y - 3.6 : fx.y + 5.2} textAnchor="middle" fontSize="2.4" fill="#9fb0cc">
                {fx.id}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {(["面光", "侧光", "逆光", "效果光"] as Zone[]).map((z) => (
          <span key={z} className={zoneFilter === z ? "legend-on" : ""}>
            <i className={`zone-dot zone-${z}`} />
            {z}
          </span>
        ))}
        <span>
          <i className="zone-dot" style={{ background: "#ffd166" }} />
          已选灯具
        </span>
        <span>
          <i className="zone-dot" style={{ background: "#f59e0b" }} />
          焦位覆盖
        </span>
      </div>
    </div>
  );
}
