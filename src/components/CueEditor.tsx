import type { Cue, Fixture, Zone } from "../types";

interface Props {
  draft: Cue;
  visibleFixtures: Fixture[];
  zoneFilter: Zone | "全部";
  selectedIds: Set<string>;
  onChange: (patch: Partial<Cue>) => void;
  onNoteChange: (note: string) => void;
  onLevelChange: (fixtureId: string, level: number) => void;
  onFocusOverride: (fixtureId: string, focus: string) => void;
}

export default function CueEditor({
  draft,
  visibleFixtures,
  zoneFilter,
  selectedIds,
  onChange,
  onNoteChange,
  onLevelChange,
  onFocusOverride,
}: Props) {
  return (
    <div className="cue-editor">
      <div className="cue-head-grid">
        <label>
          <span>Cue 编号</span>
          <input value={draft.id} disabled title="编号在创建时确定" />
        </label>
        <label className="grow">
          <span>场景名</span>
          <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="如：冷蓝侧光 · 二幕开场" />
        </label>
        <label>
          <span>淡入（秒）</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={draft.time}
            onChange={(e) => onChange({ time: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      </div>

      <label className="note-label">
        <span>
          版本备注 <em>随 Cue 一起保存</em>
        </span>
        <textarea
          rows={2}
          value={draft.note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="记录版本、导演要求、待确认事项……"
        />
      </label>

      <div className="state-table-wrap">
        <table className="state-table">
          <thead>
            <tr>
              <th>灯具</th>
              <th>通道</th>
              <th>灯区</th>
              <th>色片</th>
              <th className="col-level">调光值</th>
              <th>焦位（本 Cue 覆盖）</th>
            </tr>
          </thead>
          <tbody>
            {visibleFixtures.map((fx) => {
              const st = draft.states[fx.id] ?? { level: 0 };
              const selected = selectedIds.has(fx.id);
              return (
                <tr key={fx.id} className={selected ? "row-selected" : ""}>
                  <td className="mono">{fx.id}</td>
                  <td className="mono">CH{String(fx.channel).padStart(3, "0")}</td>
                  <td>{fx.zone}</td>
                  <td>
                    <span className="gel-cell">
                      <i style={{ background: fx.gel }} />
                      {fx.gelName}
                    </span>
                  </td>
                  <td className="col-level">
                    <div className="level-cell">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={st.level}
                        onChange={(e) => onLevelChange(fx.id, Number(e.target.value))}
                      />
                      <b className="mono">{String(st.level).padStart(3, "0")}</b>
                    </div>
                  </td>
                  <td>
                    <div className="focus-cell">
                      <input
                        value={st.focus ?? ""}
                        placeholder={fx.focus}
                        onChange={(e) => onFocusOverride(fx.id, e.target.value)}
                      />
                      {st.focus && (
                        <button
                          className="mini text-btn"
                          title="清除本 Cue 焦位覆盖，回到灯具默认焦位"
                          onClick={() => onFocusOverride(fx.id, "")}
                        >
                          默认
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {zoneFilter !== "全部" && (
        <p className="table-foot">
          表格仅显示「{zoneFilter}」{visibleFixtures.length} 盏；其余灯区的调光值仍保存在本 Cue 中，切回「全部」可见。
        </p>
      )}
    </div>
  );
}
