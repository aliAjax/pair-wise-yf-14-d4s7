import { useMemo, useState } from "react";
import "./styles.css";
import {
  Cue,
  Fixture,
  ZONE_COLORS,
  ZONES,
  Zone,
  gelColor,
  initialCues,
  initialFixtures,
} from "./data";

type ZoneFilter = Zone | "全部";

interface PendingAction {
  label: string;
  run: () => void;
}

const clampDimmer = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

function App() {
  const [showName, setShowName] = useState("《夜航》排练版");
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);
  const [cues, setCues] = useState<Cue[]>(initialCues);
  const [currentCueId, setCurrentCueId] = useState(initialCues[0].id);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("全部");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 未保存草稿：灯具字段 / 当前 Cue 调光值 / Cue 名称场景 / 版本备注
  const [draftFixture, setDraftFixture] = useState<Record<string, Partial<Fixture>>>({});
  const [draftDimmer, setDraftDimmer] = useState<Record<string, number>>({});
  const [draftCueMeta, setDraftCueMeta] = useState<Partial<Pick<Cue, "name" | "scene">>>({});
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const currentCue = cues.find((c) => c.id === currentCueId) ?? cues[0];
  const effCue: Cue = { ...currentCue, ...draftCueMeta };

  const dirty =
    Object.keys(draftFixture).length > 0 ||
    Object.keys(draftDimmer).length > 0 ||
    Object.keys(draftCueMeta).length > 0 ||
    (draftNote !== null && draftNote !== currentCue.note);

  const effFixture = (f: Fixture): Fixture => ({ ...f, ...(draftFixture[f.id] ?? {}) });
  const effDimmer = (id: string) => draftDimmer[id] ?? currentCue.states[id] ?? 0;
  const noteValue = draftNote ?? currentCue.note;

  const visibleFixtures = useMemo(
    () => fixtures.filter((f) => zoneFilter === "全部" || effFixture(f).zone === zoneFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixtures, zoneFilter, draftFixture]
  );

  const clearDrafts = () => {
    setDraftFixture({});
    setDraftDimmer({});
    setDraftCueMeta({});
    setDraftNote(null);
  };

  const save = () => {
    setFixtures((prev) => prev.map((f) => ({ ...f, ...(draftFixture[f.id] ?? {}) })));
    setCues((prev) =>
      prev.map((c) =>
        c.id === currentCueId
          ? { ...c, ...draftCueMeta, note: noteValue, states: { ...c.states, ...draftDimmer } }
          : c
      )
    );
    clearDrafts();
  };

  const doSwitch = (id: string) => {
    setCurrentCueId(id);
    clearDrafts();
  };

  const requestSwitch = (id: string) => {
    if (id === currentCueId) return;
    const target = cues.find((c) => c.id === id);
    if (dirty) {
      setPending({ label: `切换到「${target?.name ?? id}」`, run: () => doSwitch(id) });
    } else {
      doSwitch(id);
    }
  };

  const addCue = () => {
    const create = () => {
      const seq = cues.reduce((m, c) => Math.max(m, c.seq), 0) + 1;
      const states: Record<string, number> = {};
      fixtures.forEach((f) => (states[f.id] = effDimmer(f.id)));
      const nc: Cue = {
        id: `cue-${Date.now()}`,
        seq,
        name: `Cue ${seq}`,
        scene: "新场景",
        note: "",
        states,
      };
      setCues((prev) => [...prev, nc]);
      setCurrentCueId(nc.id);
      clearDrafts();
    };
    if (dirty) setPending({ label: "新增 Cue", run: create });
    else create();
  };

  // 筛选只影响列表与平面高亮，不清除已选灯具
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setDraftField = (id: string, patch: Partial<Fixture>) =>
    setDraftFixture((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const applyBatch = (patch: Partial<Fixture>) =>
    selectedIds.forEach((id) => setDraftField(id, patch));

  const applyBatchDimmer = (v: number) =>
    setDraftDimmer((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => (next[id] = clampDimmer(v)));
      return next;
    });

  const selectedFixtures = fixtures.filter((f) => selectedIds.has(f.id)).map(effFixture);
  const hiddenSelected = selectedFixtures.filter(
    (f) => zoneFilter !== "全部" && f.zone !== zoneFilter
  ).length;

  const common = <K extends keyof Fixture>(key: K): Fixture[K] | undefined => {
    if (selectedFixtures.length === 0) return undefined;
    const first = selectedFixtures[0][key];
    return selectedFixtures.every((f) => f[key] === first) ? first : undefined;
  };
  const commonDimmer = (() => {
    if (selectedFixtures.length === 0) return undefined;
    const first = effDimmer(selectedFixtures[0].id);
    return selectedFixtures.every((f) => effDimmer(f.id) === first) ? first : undefined;
  })();

  const pendingFocus = fixtures.filter((f) => effFixture(f).focus.includes("待定")).length;

  const zoneAvg = (z: Zone) => {
    const fs = fixtures.filter((f) => effFixture(f).zone === z);
    if (fs.length === 0) return 0;
    return Math.round(fs.reduce((s, f) => s + effDimmer(f.id), 0) / fs.length);
  };

  const exportList = () => {
    const zones = zoneFilter === "全部" ? ZONES : [zoneFilter];
    const lines: string[] = [
      `${showName} — 排练灯光清单`,
      `导出时间：${new Date().toLocaleString("zh-CN")}`,
      `灯区筛选：${zones.join("、")}`,
    ];
    if (dirty) lines.push("注意：当前存在未保存改动，未包含在本清单中。");
    lines.push("");
    for (const cue of [...cues].sort((a, b) => a.seq - b.seq)) {
      lines.push(`■ ${cue.name}｜${cue.scene}`);
      if (cue.note) lines.push(`  版本备注：${cue.note}`);
      for (const f of fixtures.filter((f) => zones.includes(f.zone))) {
        lines.push(
          `  ${f.id}  CH${String(f.channel).padStart(3, "0")}  色片 ${f.gel}  焦位[${f.focus}]  预设 ${f.preset}%  →  亮度 ${cue.states[f.id] ?? 0}%`
        );
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `排练清单_${zones.join("-")}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="show-name">
          <span>演出名称</span>
          <input value={showName} onChange={(e) => setShowName(e.target.value)} />
        </div>
        <div className="topbar-actions">
          {dirty && <span className="dirty-badge">● 未保存改动</span>}
          <button className="ghost" onClick={exportList}>
            导出排练清单（{zoneFilter}）
          </button>
          <button className="primary" onClick={save} disabled={!dirty}>
            保存到 {effCue.name}
          </button>
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{fixtures.length}</strong>
        </article>
        <article>
          <small>Cue 数量</small>
          <strong>{cues.length}</strong>
        </article>
        <article>
          <small>当前场景</small>
          <strong className="scene-name">{effCue.scene}</strong>
        </article>
        <article>
          <small>待确认焦点</small>
          <strong className={pendingFocus > 0 ? "warn" : ""}>{pendingFocus}</strong>
        </article>
      </section>

      <div className="workbench">
        {/* 左栏：Cue 列表 + 版本备注 */}
        <aside className="panel cue-panel">
          <div className="panel-head">
            <h2>Cue 顺序</h2>
            <button className="ghost small" onClick={addCue}>
              + 新增
            </button>
          </div>
          <ol className="cue-list">
            {[...cues]
              .sort((a, b) => a.seq - b.seq)
              .map((cue) => (
                <li
                  key={cue.id}
                  className={cue.id === currentCueId ? "active" : ""}
                  onClick={() => requestSwitch(cue.id)}
                >
                  <b>{cue.seq}</b>
                  <div>
                    <h3>
                      {cue.id === currentCueId ? effCue.name : cue.name}
                      {cue.id === currentCueId && dirty && <i className="dot" title="未保存" />}
                    </h3>
                    <p>{cue.id === currentCueId ? effCue.scene : cue.scene}</p>
                  </div>
                </li>
              ))}
          </ol>

          <div className="cue-meta">
            <label>
              <span>Cue 名称</span>
              <input
                value={effCue.name}
                onChange={(e) => setDraftCueMeta((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              <span>场景</span>
              <input
                value={effCue.scene}
                onChange={(e) => setDraftCueMeta((p) => ({ ...p, scene: e.target.value }))}
              />
            </label>
            <label>
              <span>版本备注（随 Cue 保存）</span>
              <textarea
                rows={3}
                value={noteValue}
                placeholder="记录本版调整，例如：版本B 侧光压 10%"
                onChange={(e) => setDraftNote(e.target.value)}
              />
            </label>
          </div>
        </aside>

        {/* 中栏：舞台平面 + 场景预览 */}
        <section className="center-col">
          <div className="panel">
            <div className="panel-head">
              <h2>舞台平面</h2>
              <span className="hint">点击灯位选择 / 取消</span>
            </div>
            <svg viewBox="0 0 100 64" className="plan" role="img">
              <rect x="12" y="12" width="76" height="36" rx="2" className="stage-floor" />
              <text x="50" y="31" className="plan-label">
                舞台
              </text>
              <text x="50" y="62" className="plan-label">
                观众席
              </text>
              {fixtures.map((f) => {
                const ef = effFixture(f);
                const d = effDimmer(f.id) / 100;
                const inFilter = zoneFilter === "全部" || ef.zone === zoneFilter;
                const selected = selectedIds.has(f.id);
                return (
                  <g
                    key={f.id}
                    className={`plan-fixture ${inFilter ? "" : "dimmed"} ${selected ? "selected" : ""}`}
                    onClick={() => toggleSelect(f.id)}
                  >
                    <circle cx={f.x} cy={f.y} r={4.6} fill={gelColor(ef.gel)} opacity={inFilter ? 0.15 + 0.55 * d : 0.05} />
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={2.1}
                      fill={ZONE_COLORS[ef.zone]}
                      opacity={inFilter ? 1 : 0.25}
                      stroke={selected ? "#fff" : "transparent"}
                      strokeWidth={0.5}
                    />
                    {selected && (
                      <circle cx={f.x} cy={f.y} r={3.4} fill="none" stroke="#fff" strokeWidth={0.4} strokeDasharray="1 0.8" />
                    )}
                    <text x={f.x} y={f.y - 5.4} className="plan-tag" opacity={inFilter ? 0.9 : 0.3}>
                      {f.id}
                    </text>
                    <title>{`${f.id} CH${ef.channel} ${ef.gel} 焦位[${ef.focus}] 亮度 ${effDimmer(f.id)}%`}</title>
                  </g>
                );
              })}
            </svg>
            <div className="legend">
              {ZONES.map((z) => (
                <span key={z}>
                  <i style={{ background: ZONE_COLORS[z] }} />
                  {z}
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>场景预览 · {effCue.name}</h2>
              <span className="hint">{effCue.scene}</span>
            </div>
            <div className="preview">
              <div className="preview-stage">
                {fixtures.map((f) => {
                  const ef = effFixture(f);
                  const d = effDimmer(f.id) / 100;
                  return (
                    <div
                      key={f.id}
                      className="beam"
                      style={{
                        left: `${f.x}%`,
                        top: `${(f.y / 64) * 100}%`,
                        width: `${10 + d * 14}%`,
                        background: `radial-gradient(circle, ${gelColor(ef.gel)} 0%, transparent 68%)`,
                        opacity: d * 0.9,
                      }}
                    />
                  );
                })}
                <div className="preview-floor" />
              </div>
              <div className="zone-bars">
                {ZONES.map((z) => (
                  <div key={z} className="zone-bar">
                    <span>{z}</span>
                    <div className="bar">
                      <i style={{ width: `${zoneAvg(z)}%`, background: ZONE_COLORS[z] }} />
                    </div>
                    <b>{zoneAvg(z)}%</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 右栏：筛选 + 灯具列表 + 选中编辑 */}
        <section className="panel fixture-panel">
          <div className="panel-head">
            <h2>灯具列表</h2>
            <span className="hint">
              已选 {selectedIds.size} 台{hiddenSelected > 0 ? `（${hiddenSelected} 台被筛选隐藏）` : ""}
            </span>
          </div>
          <div className="chips">
            {(["全部", ...ZONES] as ZoneFilter[]).map((z) => (
              <button
                key={z}
                className={zoneFilter === z ? "chip active" : "chip"}
                style={z !== "全部" ? ({ "--zc": ZONE_COLORS[z] } as React.CSSProperties) : undefined}
                onClick={() => setZoneFilter(z)}
              >
                {z}
              </button>
            ))}
          </div>

          <div className="fixture-table">
            <div className="ft-row ft-head">
              <span />
              <span>编号</span>
              <span>CH</span>
              <span>色片</span>
              <span>焦位</span>
              <span>预设</span>
              <span>亮度</span>
            </div>
            {visibleFixtures.map((f) => {
              const ef = effFixture(f);
              const selected = selectedIds.has(f.id);
              return (
                <div
                  key={f.id}
                  className={`ft-row ${selected ? "selected" : ""}`}
                  onClick={() => toggleSelect(f.id)}
                >
                  <span className="ft-check">{selected ? "✓" : ""}</span>
                  <span className="ft-id">
                    <i style={{ background: ZONE_COLORS[ef.zone] }} />
                    {ef.id}
                  </span>
                  <span>{ef.channel}</span>
                  <span>{ef.gel}</span>
                  <span className={ef.focus.includes("待定") ? "warn" : ""}>{ef.focus}</span>
                  <span>{ef.preset}%</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={draftDimmer[f.id] !== undefined ? "dimmer draft" : "dimmer"}
                      value={effDimmer(f.id)}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v))
                          setDraftDimmer((p) => ({ ...p, [f.id]: clampDimmer(v) }));
                      }}
                    />
                  </span>
                </div>
              );
            })}
            {visibleFixtures.length === 0 && <p className="empty">该灯区暂无灯具</p>}
          </div>

          {selectedFixtures.length > 0 && (
            <div className="batch-panel">
              <div className="panel-head">
                <h3>编辑选中（{selectedFixtures.length} 台）</h3>
                <button className="ghost small" onClick={() => setSelectedIds(new Set())}>
                  清除选择
                </button>
              </div>
              <div className="batch-grid">
                <label>
                  <span>通道号</span>
                  <input
                    type="number"
                    value={common("channel") ?? ""}
                    placeholder={common("channel") === undefined ? "多个值" : ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) applyBatch({ channel: v });
                    }}
                  />
                </label>
                <label>
                  <span>色片</span>
                  <input
                    value={common("gel") ?? ""}
                    placeholder={common("gel") === undefined ? "多个值" : ""}
                    onChange={(e) => applyBatch({ gel: e.target.value })}
                  />
                </label>
                <label>
                  <span>焦点位置</span>
                  <input
                    value={common("focus") ?? ""}
                    placeholder={common("focus") === undefined ? "多个值" : ""}
                    onChange={(e) => applyBatch({ focus: e.target.value })}
                  />
                </label>
                <label>
                  <span>亮度预设 %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={common("preset") ?? ""}
                    placeholder={common("preset") === undefined ? "多个值" : ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) applyBatch({ preset: clampDimmer(v) });
                    }}
                  />
                </label>
                <label className="span2">
                  <span>
                    {effCue.name} 调光值 {commonDimmer !== undefined ? `${commonDimmer}%` : "（多个值）"}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={commonDimmer ?? 50}
                    onChange={(e) => applyBatchDimmer(parseInt(e.target.value, 10))}
                  />
                </label>
              </div>
            </div>
          )}
        </section>
      </div>

      {pending && (
        <div className="modal-mask" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>当前 Cue 有未保存改动</h3>
            <p>
              「{effCue.name}」的修改尚未保存。要继续「{pending.label}」吗？改动会保留在当前编辑中，直到你保存或放弃。
            </p>
            <div className="modal-actions">
              <button className="primary" onClick={() => setPending(null)}>
                继续编辑（保留改动）
              </button>
              <button
                onClick={() => {
                  save();
                  pending.run();
                  setPending(null);
                }}
              >
                保存并继续
              </button>
              <button
                className="danger"
                onClick={() => {
                  clearDrafts();
                  pending.run();
                  setPending(null);
                }}
              >
                放弃改动并继续
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
