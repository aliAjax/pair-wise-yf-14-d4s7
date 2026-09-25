import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Cue, Fixture, ShowFile, Zone } from "./types";
import { ZONES } from "./types";
import { seedShow } from "./data";
import {
  buildRehearsalList,
  clone,
  isCueDirty,
  nextCueId,
  reconcileCues,
  statesFromPresets,
} from "./utils";
import StagePlan from "./components/StagePlan";
import ScenePreview from "./components/ScenePreview";
import CueList from "./components/CueList";
import CueEditor from "./components/CueEditor";
import FixtureList from "./components/FixtureList";
import ConfirmDialog from "./components/ConfirmDialog";

export default function App() {
  const [showName, setShowName] = useState(seedShow.showName);
  const [fixtures, setFixtures] = useState<Fixture[]>(seedShow.fixtures);
  const [cues, setCues] = useState<Cue[]>(seedShow.cues);
  const [activeId, setActiveId] = useState(seedShow.cues[0].id);
  const [draft, setDraft] = useState<Cue>(() => clone(seedShow.cues[0]));

  const [zoneFilter, setZoneFilter] = useState<Zone | "全部">("全部");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

  const activeCue = cues.find((c) => c.id === activeId);
  const dirty = useMemo(() => (activeCue ? isCueDirty(activeCue, draft) : false), [activeCue, draft]);

  // 有未保存改动时，关闭/刷新页面先提醒
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ---------- Cue 切换（脏数据拦截，内容留住） ---------- */

  const loadCue = (cueId: string) => {
    const cue = cues.find((c) => c.id === cueId);
    if (!cue) return;
    setActiveId(cueId);
    setDraft(clone(cue));
  };

  const requestSwitch = (cueId: string) => {
    if (cueId === activeId) return;
    if (dirty) setPendingSwitch(cueId);
    else loadCue(cueId);
  };

  const saveDraft = () => {
    setCues((cs) => cs.map((c) => (c.id === activeId ? clone(draft) : c)));
  };

  const confirmSaveAndSwitch = () => {
    saveDraft();
    const target = pendingSwitch;
    setPendingSwitch(null);
    if (target) loadCue(target);
  };

  const confirmDiscardAndSwitch = () => {
    const target = pendingSwitch;
    setPendingSwitch(null);
    if (target) loadCue(target);
  };

  /* ---------- Cue 编辑 ---------- */

  const patchDraft = (patch: Partial<Cue>) => setDraft((d) => ({ ...d, ...patch }));

  const setLevel = (fixtureId: string, level: number) =>
    setDraft((d) => ({
      ...d,
      states: { ...d.states, [fixtureId]: { ...d.states[fixtureId], level } },
    }));

  const setFocusOverride = (fixtureId: string, focus: string) =>
    setDraft((d) => {
      const prev = d.states[fixtureId] ?? { level: 0 };
      const states = { ...d.states, [fixtureId]: { level: prev.level, ...(focus ? { focus } : {}) } };
      return { ...d, states };
    });

  const revertDraft = () => {
    if (activeCue) setDraft(clone(activeCue));
  };

  /* ---------- Cue 增删排序 ---------- */

  const addCue = () => {
    const id = nextCueId(cues);
    const cue: Cue = {
      id,
      name: "新场景",
      time: 3,
      states: statesFromPresets(fixtures, 0.4),
      note: "",
    };
    // 当前 Cue 若有未保存改动，先留住内容再跳走
    setCues((cs) => {
      const base = dirty ? cs.map((c) => (c.id === activeId ? clone(draft) : c)) : cs;
      return [...base, cue];
    });
    loadCueFromExternal(cue);
  };

  // 新增/复制后若当前 Cue 无脏改动则直接跳过去
  const loadCueFromExternal = (cue: Cue) => {
    setActiveId(cue.id);
    setDraft(clone(cue));
  };

  const duplicateCue = (sourceId: string) => {
    const src = cues.find((c) => c.id === sourceId);
    if (!src) return;
    const id = nextCueId(cues);
    const copy: Cue = { ...clone(src), id, name: `${src.name}（副本）` };
    setCues((cs) => {
      const base = dirty ? cs.map((c) => (c.id === activeId ? clone(draft) : c)) : cs;
      const idx = base.findIndex((c) => c.id === sourceId);
      const next = [...base];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    loadCueFromExternal(copy);
  };

  const deleteCue = (id: string) => {
    const cue = cues.find((c) => c.id === id);
    if (!cue) return;
    if (!window.confirm(`确定删除 Cue ${id}「${cue.name}」？`)) return;
    const next = cues.filter((c) => c.id !== id);
    setCues(next);
    if (id === activeId) {
      setActiveId(next[0]?.id ?? "");
      if (next[0]) setDraft(clone(next[0]));
    }
  };

  const moveCue = (id: string, dir: -1 | 1) => {
    setCues((cs) => {
      const idx = cs.findIndex((c) => c.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  /* ---------- 灯具主数据 ---------- */

  const updateFixture = (id: string, patch: Partial<Fixture>) =>
    setFixtures((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addFixture = (fixture: Fixture) => {
    setFixtures((fs) => [...fs, fixture]);
    // 已保存 Cue 补一条 0 亮度状态；当前编辑中的 draft 也要补，否则调光台无法推
    setCues((cs) => reconcileCues(cs, [...fixtures, fixture]));
    setDraft((d) => {
      if (d.states[fixture.id]) return d;
      return { ...d, states: { ...d.states, [fixture.id]: { level: 0 } } };
    });
    setSelectedIds((s) => new Set(s).add(fixture.id));
    setZoneFilter(fixture.zone);
  };

  const deleteFixture = (id: string) => {
    const fx = fixtures.find((f) => f.id === id);
    if (!fx) return;
    if (!window.confirm(`确定删除灯具 ${id}？所有 Cue 中该灯的状态会一并移除。`)) return;
    const nextFixtures = fixtures.filter((f) => f.id !== id);
    setFixtures(nextFixtures);
    setCues((cs) => reconcileCues(cs, nextFixtures));
    setDraft((d) => {
      const states = { ...d.states };
      delete states[id];
      return { ...d, states };
    });
    setSelectedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const suggestFixtureId = (zone: Zone) => {
    const prefix = zone === "面光" ? "FOH" : zone === "侧光" ? "SL" : zone === "逆光" ? "BL" : "FX";
    const nums = fixtures
      .filter((f) => f.id.startsWith(prefix))
      .map((f) => Number(f.id.split("-")[1]))
      .filter((n) => Number.isFinite(n));
    return `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;
  };

  /* ---------- 导出排练清单（按当前筛选） ---------- */

  const exportList = () => {
    const show: ShowFile = { showName, fixtures, cues };
    const { filename, content } = buildRehearsalList(show, zoneFilter, selectedIds);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- 派生数据 ---------- */

  const visibleFixtures = fixtures.filter((f) => zoneFilter === "全部" || f.zone === zoneFilter);
  const litCount = Object.values(draft.states).filter((s) => s.level > 0).length;
  const focusPending = fixtures.filter((f) => f.focus.includes("待确认")).length;

  const zoneCounts = ZONES.map((z) => ({
    zone: z,
    count: fixtures.filter((f) => f.zone === z).length,
  }));

  return (
    <main className="app app-workbench">
      {/* 顶栏 */}
      <header className="topbar">
        <div>
          <p className="eyebrow">灯位与 Cue 工作台 · 排练模式</p>
          <input className="show-name" value={showName} onChange={(e) => setShowName(e.target.value)} />
        </div>
        <div className="metrics">
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
            <strong className="metric-cue">
              {activeCue ? `Cue ${activeCue.id}` : "—"}
              {dirty && <i className="dirty-dot" />}
            </strong>
            <span className="metric-sub">
              {activeCue ? `${draft.name} · ${litCount} 灯亮` : "点击左侧「新 Cue」创建"}
            </span>
          </article>
          <article>
            <small>待确认焦点</small>
            <strong className={focusPending ? "metric-warn" : ""}>{focusPending}</strong>
          </article>
        </div>
      </header>

      {/* 灯区筛选 + 选择 + 导出 */}
      <section className="filterbar panel">
        <div className="chips">
          <button
            className={zoneFilter === "全部" ? "chip on" : "chip"}
            onClick={() => setZoneFilter("全部")}
          >
            全部
          </button>
          {zoneCounts.map(({ zone, count }) => (
            <button
              key={zone}
              className={zoneFilter === zone ? "chip on" : "chip"}
              onClick={() => setZoneFilter(zone)}
            >
              <i className={`zone-dot zone-${zone}`} />
              {zone} <em>{count}</em>
            </button>
          ))}
        </div>
        <div className="filter-side">
          <span className="sel-info">
            已选灯具 <b>{selectedIds.size}</b>
            {selectedIds.size > 0 && (
              <button className="link-btn" onClick={() => setSelectedIds(new Set())}>
                清空
              </button>
            )}
          </span>
          <button className="primary" onClick={exportList}>
            导出排练清单（{zoneFilter}）
          </button>
        </div>
      </section>

      <div className="layout">
        {/* 左：Cue 顺序 */}
        <aside className="panel left-panel">
          <CueList
            cues={cues}
            activeId={activeId}
            draftDirty={dirty}
            onSelect={requestSwitch}
            onAdd={addCue}
            onDelete={deleteCue}
            onDuplicate={duplicateCue}
            onMove={moveCue}
          />
        </aside>

        {/* 中：舞台平面 + 场景预览 */}
        <section className="center-col">
          {activeCue ? (
            <>
              <div className="panel">
                <StagePlan
                  fixtures={fixtures}
                  cue={draft}
                  zoneFilter={zoneFilter}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              </div>
              <div className="panel">
                <ScenePreview fixtures={fixtures} cue={draft} zoneFilter={zoneFilter} />
              </div>
            </>
          ) : (
            <div className="panel empty-state">
              <p>还没有任何 Cue</p>
              <button className="primary" onClick={addCue}>
                ＋ 新建第一个 Cue
              </button>
            </div>
          )}
        </section>

        {/* 右：当前 Cue 调光台 */}
        <section className="panel right-panel">
          {activeCue ? (
            <>
              <div className="card-title cue-bar">
                <div>
                  <h3>Cue {draft.id} 调光台</h3>
                  <span className="card-hint">平面 / 预览 / 调光值随当前编辑一起切换</span>
                </div>
                <div className="cue-save">
                  {dirty && <span className="unsaved-tag">● 未保存</span>}
                  <button className="mini" onClick={revertDraft} disabled={!dirty}>
                    还原
                  </button>
                  <button className="mini primary" onClick={saveDraft} disabled={!dirty}>
                    保存 Cue
                  </button>
                </div>
              </div>
              {dirty && (
                <div className="dirty-banner">
                  正在编辑的内容尚未保存；切换到其它 Cue 时会先询问，改动不会丢失。
                </div>
              )}
              <CueEditor
                draft={draft}
                visibleFixtures={visibleFixtures}
                zoneFilter={zoneFilter}
                selectedIds={selectedIds}
                onChange={patchDraft}
                onNoteChange={(note) => patchDraft({ note })}
                onLevelChange={setLevel}
                onFocusOverride={setFocusOverride}
              />
            </>
          ) : (
            <div className="empty-state">
              <p>新建 Cue 后在此调节调光值、焦位覆盖与版本备注。</p>
              <button className="primary" onClick={addCue}>
                ＋ 新 Cue
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 底部：灯具主数据 */}
      <section className="panel">
        <FixtureList
          fixtures={fixtures}
          zoneFilter={zoneFilter}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onUpdate={updateFixture}
          onDelete={deleteFixture}
          onAdd={addFixture}
          suggestId={suggestFixtureId}
        />
      </section>

      <ConfirmDialog
        open={pendingSwitch !== null}
        title={`Cue ${activeId} 有未保存改动`}
        message={`要切到 Cue ${pendingSwitch ?? ""} 吗？可以先保存当前调光与版本备注，或放弃改动；也可以留下来继续编辑。`}
        onSave={confirmSaveAndSwitch}
        onDiscard={confirmDiscardAndSwitch}
        onCancel={() => setPendingSwitch(null)}
      />
    </main>
  );
}
