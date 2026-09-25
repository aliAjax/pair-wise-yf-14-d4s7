import type { Cue } from "../types";

interface Props {
  cues: Cue[];
  activeId: string;
  draftDirty: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}

export default function CueList({
  cues,
  activeId,
  draftDirty,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
}: Props) {
  return (
    <div className="cue-list">
      <div className="card-title">
        <h3>Cue 顺序</h3>
        <button className="mini" onClick={onAdd}>
          ＋ 新 Cue
        </button>
      </div>
      <ol>
        {cues.map((cue, i) => {
          const active = cue.id === activeId;
          return (
            <li key={cue.id} className={active ? "cue-row active" : "cue-row"}>
              <button className="cue-main" onClick={() => onSelect(cue.id)} title="切换到该 Cue">
                <span className="cue-no">
                  Cue {cue.id}
                  {active && draftDirty && <i className="dirty-dot" title="有未保存改动" />}
                </span>
                <span className="cue-name">{cue.name}</span>
                <span className="cue-meta">
                  {cue.time}s · {Object.values(cue.states).filter((s) => s.level > 0).length} 灯亮
                </span>
              </button>
              <div className="cue-ops">
                <button disabled={i === 0} onClick={() => onMove(cue.id, -1)} title="上移">
                  ↑
                </button>
                <button disabled={i === cues.length - 1} onClick={() => onMove(cue.id, 1)} title="下移">
                  ↓
                </button>
                <button onClick={() => onDuplicate(cue.id)} title="复制">
                  ⧉
                </button>
                <button className="danger" onClick={() => onDelete(cue.id)} title="删除">
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
