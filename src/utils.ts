import type { Cue, Fixture, ShowFile, Zone } from "./types";
import { ZONES } from "./types";

/** 常用色片预设（名称 + 近似色值） */
export const GEL_PRESETS: { name: string; hex: string }[] = [
  { name: "L106  primary红", hex: "#d7263d" },
  { name: "L117 暖橙", hex: "#f59e0b" },
  { name: "L158 暖黄", hex: "#ffd166" },
  { name: "L201 冷蓝", hex: "#2d6cdf" },
  { name: "L241 荧光蓝", hex: "#06b6d4" },
  { name: "L120 深紫", hex: "#7c3aed" },
  { name: "L322 玫瑰粉", hex: "#e84a8f" },
  { name: "L181 月光蓝", hex: "#8ecae6" },
  { name: "L712 翠绿", hex: "#2ec27e" },
  { name: "L000 白光", hex: "#fff7e6" },
];

export function effectiveFocus(cue: Cue, fx: Fixture): string {
  return cue.states[fx.id]?.focus ?? fx.focus;
}

export function effectiveLevel(cue: Cue, fixtureId: string): number {
  return cue.states[fixtureId]?.level ?? 0;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 深比较：判断编辑器草稿是否相对已保存 Cue 有改动 */
export function isCueDirty(saved: Cue, draft: Cue): boolean {
  return JSON.stringify(normalizeCue(saved)) !== JSON.stringify(normalizeCue(draft));
}

function normalizeCue(cue: Cue) {
  return {
    name: cue.name,
    time: cue.time,
    note: cue.note,
    states: cue.states,
  };
}

/** 用灯具默认亮度预设置铺满一个 Cue */
export function statesFromPresets(fixtures: Fixture[], factor = 0.7): Cue["states"] {
  const states: Cue["states"] = {};
  for (const fx of fixtures) {
    states[fx.id] = { level: Math.round(fx.preset * factor) };
  }
  return states;
}

/** 灯具增删后补齐/清理各 Cue 的状态表 */
export function reconcileCues(cues: Cue[], fixtures: Fixture[]): Cue[] {
  const ids = new Set(fixtures.map((f) => f.id));
  return cues.map((cue) => {
    const states: Cue["states"] = {};
    for (const fx of fixtures) {
      const s = cue.states[fx.id];
      states[fx.id] = s ? { ...s } : { level: 0 };
    }
    for (const key of Object.keys(cue.states)) {
      if (!ids.has(key)) delete states[key];
    }
    return { ...cue, states };
  });
}

export function nextCueId(cues: Cue[]): string {
  const nums = cues.map((c) => Number(c.id)).filter((n) => Number.isFinite(n));
  return String(nums.length ? Math.max(...nums) + 1 : 1);
}

/** 按当前灯区筛选导出排练清单（纯文本，.txt 下载） */
export function buildRehearsalList(
  show: ShowFile,
  zoneFilter: Zone | "全部",
  selectedIds: Set<string>
): { filename: string; content: string } {
  const visible = show.fixtures.filter(
    (f) => zoneFilter === "全部" || f.zone === zoneFilter
  );
  const line = "=".repeat(64);
  const thin = "-".repeat(64);
  const stamp = new Date().toLocaleString("zh-CN", { hour12: false });

  const rows: string[] = [];
  rows.push(line);
  rows.push(`排练清单 · ${show.showName}`);
  rows.push(line);
  rows.push(`导出时间：${stamp}`);
  rows.push(
    `灯区筛选：${zoneFilter}　灯具数：${visible.length}　Cue 数：${show.cues.length}`
  );
  if (selectedIds.size > 0) {
    rows.push(`已选灯具：${[...selectedIds].join("、")}`);
  }
  rows.push("");

  rows.push("【灯具表】");
  rows.push(thin);
  for (const f of visible) {
    rows.push(
      `${f.id.padEnd(7)} CH${String(f.channel).padStart(3, "0")}  ${f.zone}  ` +
        `${f.gelName.padEnd(12)} 预设${String(f.preset).padStart(3, "0")}%  焦位：${f.focus}`
    );
  }
  rows.push("");

  for (const cue of show.cues) {
    rows.push(`【Cue ${cue.id}】${cue.name}　淡入 ${cue.time}s`);
    rows.push(thin);
    for (const f of visible) {
      const s = cue.states[f.id];
      const level = s?.level ?? 0;
      const focus = s?.focus ? `　焦位覆盖：${s.focus}` : "";
      const bar = fillBar(level);
      rows.push(
        `${f.id.padEnd(7)} CH${String(f.channel).padStart(3, "0")}  ` +
          `${String(level).padStart(3, "0")}% ${bar}${focus}`
      );
    }
    rows.push(`版本备注：${cue.note.trim() || "（无）"}`);
    rows.push("");
  }

  rows.push(line);
  rows.push(`灯区统计：${ZONES.map((z) => `${z} ${show.fixtures.filter((f) => f.zone === z).length}`).join("　")}`);
  rows.push(line);

  return {
    filename: `${show.showName}-排练清单-${zoneFilter}.txt`,
    content: rows.join("\n"),
  };
}

function fillBar(level: number): string {
  const filled = Math.round(level / 5);
  return "█".repeat(filled) + "░".repeat(20 - filled);
}
