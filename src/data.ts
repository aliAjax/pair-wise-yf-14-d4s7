import type { Cue, Fixture, ShowFile } from "./types";

const fixtures: Fixture[] = [
  // 面光（观众厅顶部，朝舞台打）
  { id: "FOH-01", channel: 1, gel: "#fff7e6", gelName: "L000 白光", focus: "前演区", preset: 80, zone: "面光", x: 18, y: 91 },
  { id: "FOH-02", channel: 2, gel: "#ffd166", gelName: "L158 暖黄", focus: "中央演区", preset: 85, zone: "面光", x: 39, y: 91 },
  { id: "FOH-03", channel: 3, gel: "#fff7e6", gelName: "L000 白光", focus: "门口（待确认）", preset: 70, zone: "面光", x: 61, y: 91 },
  { id: "FOH-04", channel: 4, gel: "#ffd166", gelName: "L158 暖黄", focus: "前演区", preset: 80, zone: "面光", x: 82, y: 91 },
  // 侧光
  { id: "SL-01", channel: 5, gel: "#2d6cdf", gelName: "L201 冷蓝", focus: "上场门", preset: 65, zone: "侧光", x: 5, y: 32 },
  { id: "SL-02", channel: 6, gel: "#2d6cdf", gelName: "L201 冷蓝", focus: "中央演区", preset: 65, zone: "侧光", x: 5, y: 52 },
  { id: "SL-03", channel: 7, gel: "#8ecae6", gelName: "L181 月光蓝", focus: "下场门", preset: 60, zone: "侧光", x: 5, y: 72 },
  { id: "SR-01", channel: 8, gel: "#2d6cdf", gelName: "L201 冷蓝", focus: "下场门", preset: 65, zone: "侧光", x: 95, y: 32 },
  { id: "SR-02", channel: 9, gel: "#2d6cdf", gelName: "L201 冷蓝", focus: "中央演区", preset: 65, zone: "侧光", x: 95, y: 52 },
  { id: "SR-03", channel: 10, gel: "#8ecae6", gelName: "L181 月光蓝", focus: "上场门", preset: 60, zone: "侧光", x: 95, y: 72 },
  // 逆光
  { id: "BL-01", channel: 11, gel: "#7c3aed", gelName: "L120 深紫", focus: "后演区", preset: 70, zone: "逆光", x: 18, y: 9 },
  { id: "BL-02", channel: 12, gel: "#06b6d4", gelName: "L241 荧光蓝", focus: "中央演区", preset: 70, zone: "逆光", x: 39, y: 9 },
  { id: "BL-03", channel: 13, gel: "#06b6d4", gelName: "L241 荧光蓝", focus: "中央演区", preset: 70, zone: "逆光", x: 61, y: 9 },
  { id: "BL-04", channel: 14, gel: "#7c3aed", gelName: "L120 深紫", focus: "后演区", preset: 70, zone: "逆光", x: 82, y: 9 },
  // 效果光
  { id: "FX-01", channel: 15, gel: "#e84a8f", gelName: "L322 玫瑰粉", focus: "舞台中央", preset: 55, zone: "效果光", x: 30, y: 90 },
  { id: "FX-02", channel: 16, gel: "#f59e0b", gelName: "L117 暖橙", focus: "舞台中央", preset: 55, zone: "效果光", x: 70, y: 90 },
  { id: "FX-03", channel: 17, gel: "#2ec27e", gelName: "L712 翠绿", focus: "后演区", preset: 45, zone: "效果光", x: 50, y: 8 },
];

function levels(map: Array<[string, number]>, focusOverride?: Record<string, string>): Cue["states"] {
  const states: Cue["states"] = {};
  for (const fx of fixtures) states[fx.id] = { level: 0 };
  for (const [id, level] of map) states[id] = { level, ...(focusOverride?.[id] ? { focus: focusOverride[id] } : {}) };
  return states;
}

const cues: Cue[] = [
  {
    id: "1",
    name: "观众入场",
    time: 8,
    note: "v1 暖场氛围，面光压暗，观众席场灯渐暗后保留 30%。",
    states: levels([
      ["FOH-02", 30],
      ["FOH-04", 25],
      ["BL-01", 12],
      ["BL-04", 12],
    ]),
  },
  {
    id: "12",
    name: "冷蓝侧光 · 二幕开场",
    time: 5,
    note: "v2 二幕开场，侧光为主、逆光勾边；导演要求开场前 2 秒不要提前起。",
    states: levels([
      ["SL-01", 65], ["SL-02", 65], ["SL-03", 55],
      ["SR-01", 65], ["SR-02", 65], ["SR-03", 55],
      ["BL-02", 45], ["BL-03", 45],
      ["FOH-01", 10],
    ]),
  },
  {
    id: "18",
    name: "追光入场",
    time: 2,
    note: "需演员走位确认：FOH-03 焦位等周四联排后定，暂定门口。",
    states: levels(
      [
        ["FOH-03", 95],
        ["BL-01", 20], ["BL-02", 20], ["BL-03", 20], ["BL-04", 20],
      ],
      { "FOH-03": "上场门口（走位待确认）" }
    ),
  },
  {
    id: "24",
    name: "暖色谢幕",
    time: 6,
    note: "版本B：全台面光 80%，演员站定后推暖橙，谢幕三次后压光。",
    states: levels([
      ["FOH-01", 80], ["FOH-02", 80], ["FOH-03", 80], ["FOH-04", 80],
      ["FX-01", 50], ["FX-02", 50],
      ["BL-01", 30], ["BL-04", 30],
    ]),
  },
];

export const seedShow: ShowFile = {
  showName: "《雾中灯塔》联排",
  fixtures,
  cues,
};
