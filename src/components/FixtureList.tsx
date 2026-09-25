import { useState } from "react";
import type { Fixture, Zone } from "../types";
import { ZONES } from "../types";
import { GEL_PRESETS } from "../utils";

interface Props {
  fixtures: Fixture[];
  zoneFilter: Zone | "全部";
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Fixture>) => void;
  onDelete: (id: string) => void;
  onAdd: (fixture: Fixture) => void;
  suggestId: (zone: Zone) => string;
}

const ZONE_ANCHORS: Record<Zone, Array<[number, number]>> = {
  面光: [
    [30, 91],
    [50, 91],
    [70, 91],
  ],
  侧光: [
    [5, 42],
    [95, 42],
    [5, 62],
    [95, 62],
  ],
  逆光: [
    [30, 9],
    [50, 9],
    [70, 9],
  ],
  效果光: [
    [40, 90],
    [60, 90],
    [50, 9],
  ],
};

function emptyDraft(id: string, channel: number, zone: Zone): Fixture {
  const anchors = ZONE_ANCHORS[zone];
  const [x, y] = anchors[Math.floor(Math.random() * anchors.length)];
  return {
    id,
    channel,
    gel: GEL_PRESETS[9].hex,
    gelName: GEL_PRESETS[9].name,
    focus: "中央演区",
    preset: 60,
    zone,
    x: Math.max(8, Math.min(92, x + (Math.random() * 6 - 3))),
    y: Math.max(6, Math.min(94, y + (Math.random() * 4 - 2))),
  };
}

export default function FixtureList({
  fixtures,
  zoneFilter,
  selectedIds,
  onToggleSelect,
  onUpdate,
  onDelete,
  onAdd,
  suggestId,
}: Props) {
  const maxChannel = fixtures.reduce((m, f) => Math.max(m, f.channel), 0);
  const [adding, setAdding] = useState(false);
  const [zone, setZone] = useState<Zone>("面光");
  const [draft, setDraft] = useState<Fixture>(() => emptyDraft(suggestId("面光"), maxChannel + 1, "面光"));

  const startAdd = () => {
    setZone("面光");
    setDraft(emptyDraft(suggestId("面光"), maxChannel + 1, "面光"));
    setAdding(true);
  };

  const switchZone = (z: Zone) => {
    setZone(z);
    setDraft((d) => ({ ...d, ...emptyDraft(suggestId(z), d.channel, z) }));
  };

  const submit = () => {
    if (!draft.id.trim()) return;
    onAdd({ ...draft, id: draft.id.trim() });
    setAdding(false);
  };

  return (
    <div className="fixture-panel">
      <div className="card-title">
        <h3>灯具表</h3>
        <span className="card-hint">编号 / 通道 / 色片 / 焦位 / 亮度预设 / 灯区（主数据，直接生效）</span>
        {!adding && (
          <button className="mini" onClick={startAdd}>
            ＋ 加灯
          </button>
        )}
      </div>

      {adding && (
        <div className="add-form">
          <div className="add-row">
            <label>
              <span>灯区</span>
              <select value={zone} onChange={(e) => switchZone(e.target.value as Zone)}>
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>编号</span>
              <input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
            </label>
            <label>
              <span>通道</span>
              <input
                type="number"
                min={1}
                value={draft.channel}
                onChange={(e) => setDraft({ ...draft, channel: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="add-row">
            <label className="grow">
              <span>焦位</span>
              <input value={draft.focus} onChange={(e) => setDraft({ ...draft, focus: e.target.value })} />
            </label>
            <label>
              <span>亮度预设</span>
              <input
                type="number"
                min={0}
                max={100}
                value={draft.preset}
                onChange={(e) =>
                  setDraft({ ...draft, preset: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
                }
              />
            </label>
          </div>
          <div className="add-row gel-row">
            <span>色片</span>
            {GEL_PRESETS.map((g) => (
              <button
                key={g.name}
                type="button"
                title={g.name}
                className={draft.gel === g.hex ? "gel-swatch on" : "gel-swatch"}
                style={{ background: g.hex }}
                onClick={() => setDraft({ ...draft, gel: g.hex, gelName: g.name })}
              />
            ))}
          </div>
          <div className="add-ops">
            <button className="primary" onClick={submit}>
              加入灯位
            </button>
            <button onClick={() => setAdding(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="fx-rows">
        {fixtures.map((fx) => {
          const dim = zoneFilter !== "全部" && fx.zone !== zoneFilter;
          const selected = selectedIds.has(fx.id);
          return (
            <div key={fx.id} className={dim ? "fx-row dim" : selected ? "fx-row selected" : "fx-row"}>
              <label className="fx-check">
                <input type="checkbox" checked={selected} onChange={() => onToggleSelect(fx.id)} />
              </label>
              <button className="fx-pick" title="在平面图高亮（已选择）" onClick={() => onToggleSelect(fx.id)}>
                <i style={{ background: fx.gel }} />
              </button>
              <div className="fx-id mono">{fx.id}</div>
              <div className="fx-ch mono">CH{String(fx.channel).padStart(3, "0")}</div>
              <div className={`zone-tag zone-tag-${fx.zone}`}>{fx.zone}</div>
              <input
                className="fx-focus"
                value={fx.focus}
                title="默认焦位"
                onChange={(e) => onUpdate(fx.id, { focus: e.target.value })}
              />
              <label className="fx-preset" title="亮度预设（新 Cue 默认值）">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fx.preset}
                  onChange={(e) => onUpdate(fx.id, { preset: Number(e.target.value) })}
                />
                <span className="mono">{fx.preset}</span>
              </label>
              <button className="mini danger" onClick={() => onDelete(fx.id)} title="删除灯具">
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
