export type Zone = "面光" | "侧光" | "逆光" | "效果光";

export const ZONES: Zone[] = ["面光", "侧光", "逆光", "效果光"];

export interface Fixture {
  id: string; // 灯具编号，如 FOH-01
  channel: number; // 通道号
  gel: string; // 色片（hex）
  gelName: string; // 色片名，如 L201
  focus: string; // 默认焦点位置
  preset: number; // 亮度预设 0-100
  zone: Zone; // 灯区
  x: number; // 舞台平面坐标（百分比）
  y: number;
}

/** Cue 中每盏灯的状态；焦位可在该 Cue 内覆盖 */
export interface FixtureState {
  level: number; // 调光值 0-100
  focus?: string; // 焦位覆盖
}

export interface Cue {
  id: string; // Cue 编号，如 12
  name: string; // 场景名
  time: number; // 淡入秒数
  states: Record<string, FixtureState>; // 按灯具编号索引
  note: string; // 版本备注
}

export interface ShowFile {
  showName: string;
  fixtures: Fixture[];
  cues: Cue[];
}

export interface PendingSwitch {
  cueId: string;
}
