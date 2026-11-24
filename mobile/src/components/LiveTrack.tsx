import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

// Figma 트랙(assets/figma/44091.svg)과 같은 좌표. 출발선(151)에서 시계 방향으로 한 바퀴.
const START_X = 151;
const LEFT_X = 66;
const RIGHT_X = 236;
const RIGHT_RUN = RIGHT_X - START_X;
const BOTTOM_RUN = RIGHT_X - LEFT_X;
const LEFT_RUN = START_X - LEFT_X;

type Lane = { top: number; bottom: number; r: number };

const LANES: Lane[] = [0, 1, 2, 3].map(i => ({ top: 8 + i * 10, bottom: 120 - i * 10, r: 56 - i * 10 }));
const MINE = LANES[2];
const GHOST = LANES[3];

const laneLength = ({ r }: Lane) => RIGHT_RUN + BOTTOM_RUN + LEFT_RUN + 2 * Math.PI * r;
const lanePath = ({ top, bottom, r }: Lane, startAtLine: boolean) => {
  const from = startAtLine ? START_X : LEFT_X;
  return `M${from} ${top}H${RIGHT_X}A${r} ${r} 0 0 1 ${RIGHT_X} ${bottom}H${LEFT_X}A${r} ${r} 0 0 1 ${LEFT_X} ${top}${startAtLine ? `H${START_X}` : 'Z'}`;
};

function pointAt(lane: Lane, fraction: number) {
  const { top, bottom, r } = lane;
  const cy = (top + bottom) / 2;
  const arc = Math.PI * r;
  let s = Math.min(Math.max(fraction, 0), 1) * laneLength(lane);
  if (s <= RIGHT_RUN) return { x: START_X + s, y: top };
  s -= RIGHT_RUN;
  if (s <= arc) return { x: RIGHT_X + r * Math.sin(s / r), y: cy - r * Math.cos(s / r) };
  s -= arc;
  if (s <= BOTTOM_RUN) return { x: RIGHT_X - s, y: bottom };
  s -= BOTTOM_RUN;
  if (s <= arc) return { x: LEFT_X - r * Math.sin(s / r), y: cy + r * Math.cos(s / r) };
  s -= arc;
  return { x: LEFT_X + s, y: top };
}

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0);

// meM: 내가 달린 거리(m), ghostM: 기록 속의 내가 같은 시간에 달렸을 거리(m), goalM: 트랙 한 바퀴 = 목표 거리(m)
export function LiveTrack({ meM, ghostM, goalM }: { meM: number; ghostM: number; goalM: number }) {
  const me = clamp01(meM / goalM);
  const ghost = clamp01(ghostM / goalM);
  const mePoint = pointAt(MINE, me);
  const ghostPoint = pointAt(GHOST, ghost);
  const meLength = laneLength(MINE);
  const ghostLength = laneLength(GHOST);
  const label = `나는 ${Math.round(meM)}m, 기록 속의 나는 ${Math.round(ghostM)}m 지점이에요`;

  return (
    <Svg testID="running-track" accessibilityLabel={label} width="100%" viewBox="0 0 302 128" style={{ aspectRatio: 302 / 128 }}>
      {LANES.map((lane, i) => <Path key={i} d={lanePath(lane, false)} stroke="white" strokeOpacity={0.23} fill="none" />)}
      {me > 0 && <Path d={lanePath(MINE, true)} stroke="#7C8BFF" strokeWidth={4} fill="none" strokeDasharray={`${me * meLength} ${meLength}`} />}
      {ghost > 0 && <Path d={lanePath(GHOST, true)} stroke="#F38EAF" strokeWidth={4} fill="none" strokeDasharray={`${ghost * ghostLength} ${ghostLength}`} />}
      <Line x1={START_X} y1={8} x2={START_X} y2={44} stroke="white" strokeWidth={2} />
      <Circle cx={mePoint.x} cy={mePoint.y} r={6} fill="#7C8BFF" stroke="white" strokeWidth={2} />
      <Circle cx={ghostPoint.x} cy={ghostPoint.y} r={6} fill="#F38EAF" stroke="white" strokeWidth={2} />
    </Svg>
  );
}
