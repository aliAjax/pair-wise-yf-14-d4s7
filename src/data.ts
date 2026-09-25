export type Zone = "面光" | "侧光" | "逆光" | "效果光";

export interface Fixture {
  id: string; // 灯具编号
  channel: number; // 通道号
  gel: string; // 色片
  focus: string; // 焦点位置
  preset: number; // 亮度预设 0-100
  zone: Zone; // 灯区
  x: number; // 舞台平面坐标（百分比）
  y: number;
}

export interface Cue {
  id: string;
  seq: number; // 触发顺序
  name: string;
  scene: string; // 场景
  note: string; // 版本备注（随 Cue 保存）
  states: Record<string, number>; // 灯具编号 -> 该 Cue 下亮度 %
}

export const ZONES: Zone[] = ["面光", "侧光", "逆光", "效果光"];

export const ZONE_COLORS: Record<Zone, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#7c3aed",
  效果光: "#ec4899",
};

export const GEL_COLORS: Record<string, string> = {
  L203: "#ffd9a0",
  L201: "#ffe9c4",
  R80: "#3b82f6",
  R79: "#60a5fa",
  R339: "#c084fc",
  R26: "#ef4444",
  R119: "#93c5fd",
  L009: "#fef3c7",
  无: "#e2e8f0",
};

export function gelColor(gel: string): string {
  return GEL_COLORS[gel] ?? "#94a3b8";
}

export const initialFixtures: Fixture[] = [
  { id: "FOH-01", channel: 1, gel: "L203", focus: "前场左", preset: 80, zone: "面光", x: 22, y: 57 },
  { id: "FOH-02", channel: 2, gel: "L203", focus: "前场中", preset: 80, zone: "面光", x: 40, y: 57 },
  { id: "FOH-03", channel: 3, gel: "L201", focus: "门口", preset: 75, zone: "面光", x: 60, y: 57 },
  { id: "FOH-04", channel: 4, gel: "L201", focus: "待定", preset: 75, zone: "面光", x: 78, y: 57 },
  { id: "SL-01", channel: 11, gel: "R80", focus: "左侧台口", preset: 65, zone: "侧光", x: 6, y: 22 },
  { id: "SL-02", channel: 12, gel: "R80", focus: "左后区", preset: 65, zone: "侧光", x: 6, y: 40 },
  { id: "SL-03", channel: 13, gel: "R79", focus: "右侧台口", preset: 65, zone: "侧光", x: 94, y: 22 },
  { id: "SL-04", channel: 14, gel: "R79", focus: "待定", preset: 65, zone: "侧光", x: 94, y: 40 },
  { id: "BL-01", channel: 21, gel: "R339", focus: "天幕左", preset: 60, zone: "逆光", x: 30, y: 7 },
  { id: "BL-02", channel: 22, gel: "R339", focus: "天幕中", preset: 60, zone: "逆光", x: 45, y: 7 },
  { id: "BL-03", channel: 23, gel: "R119", focus: "天幕右", preset: 60, zone: "逆光", x: 57, y: 7 },
  { id: "BL-04", channel: 24, gel: "R119", focus: "待定", preset: 60, zone: "逆光", x: 72, y: 7 },
  { id: "FX-01", channel: 31, gel: "R26", focus: "舞台中心", preset: 50, zone: "效果光", x: 35, y: 30 },
  { id: "FX-02", channel: 32, gel: "L009", focus: "后区平台", preset: 50, zone: "效果光", x: 50, y: 26 },
  { id: "FX-03", channel: 33, gel: "R26", focus: "舞台中心", preset: 50, zone: "效果光", x: 65, y: 30 },
  { id: "FX-04", channel: 34, gel: "无", focus: "待定", preset: 50, zone: "效果光", x: 50, y: 44 },
];

function makeStates(zoneLevels: Record<Zone, number>, overrides: Record<string, number> = {}) {
  const states: Record<string, number> = {};
  for (const f of initialFixtures) states[f.id] = zoneLevels[f.zone];
  return { ...states, ...overrides };
}

export const initialCues: Cue[] = [
  {
    id: "cue-1",
    seq: 1,
    name: "Cue 1",
    scene: "观众入场 · 暖场",
    note: "版本A：暖场仅保留基础面光，侧逆光待命。",
    states: makeStates({ 面光: 40, 侧光: 0, 逆光: 10, 效果光: 0 }),
  },
  {
    id: "cue-2",
    seq: 2,
    name: "Cue 2",
    scene: "一幕开场",
    note: "",
    states: makeStates({ 面光: 75, 侧光: 45, 逆光: 30, 效果光: 0 }),
  },
  {
    id: "cue-5",
    seq: 5,
    name: "Cue 5",
    scene: "独白",
    note: "独白追 FOH-02，需演员走位确认。",
    states: makeStates({ 面光: 20, 侧光: 65, 逆光: 15, 效果光: 0 }, { "FOH-02": 85 }),
  },
  {
    id: "cue-9",
    seq: 9,
    name: "Cue 9",
    scene: "二幕开场",
    note: "冷蓝侧光为主，CH 021-028 亮度 65% 起。",
    states: makeStates({ 面光: 30, 侧光: 80, 逆光: 55, 效果光: 20 }),
  },
  {
    id: "cue-12",
    seq: 12,
    name: "Cue 12",
    scene: "高潮效果",
    note: "版本B：效果光全开出频闪，注意与音响对点。",
    states: makeStates({ 面光: 50, 侧光: 60, 逆光: 70, 效果光: 90 }),
  },
  {
    id: "cue-15",
    seq: 15,
    name: "Cue 15",
    scene: "暖色谢幕",
    note: "暖色谢幕，全台面光 80%。",
    states: makeStates({ 面光: 85, 侧光: 40, 逆光: 35, 效果光: 30 }),
  },
];
