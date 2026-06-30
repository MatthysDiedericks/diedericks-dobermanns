import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

import { plannerLineColour } from '@/lib/breeding/coi';
import type { CardLayout, PairingWithCoi } from '@/types/breeding';

export type LineSegment = {
  pairing: PairingWithCoi;
  from: CardLayout;
  to: CardLayout;
};

function bezierPath(from: CardLayout, to: CardLayout): string {
  const x1 = from.x + from.width / 2;
  const y1 = from.y;
  const x2 = to.x + to.width / 2;
  const y2 = to.y + to.height;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function strokeDash(status: PairingWithCoi['status'], priority: PairingWithCoi['priority']): string | undefined {
  if (status === 'Prohibited') return '4 4';
  if (status === 'Completed') return '6 4';
  if (priority === 'Future') return '8 4';
  return undefined;
}

function strokeColor(pairing: PairingWithCoi): string {
  if (pairing.status === 'Prohibited') return '#7F1D1D';
  if (pairing.status === 'Completed') return '#6B7280';
  return plannerLineColour(pairing.coi.coi);
}

interface PlannerLinesProps {
  width: number;
  height: number;
  segments: LineSegment[];
  onLinePress?: (pairing: PairingWithCoi) => void;
}

export function PlannerLines({ width, height, segments }: PlannerLinesProps) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      {segments.map(({ pairing, from, to }) => {
        const path = bezierPath(from, to);
        const color = strokeColor(pairing);
        const dash = strokeDash(pairing.status, pairing.priority);
        const mx = (from.x + from.width / 2 + to.x + to.width / 2) / 2;
        const my = (from.y + to.y + to.height) / 2;
        const label = pairing.status === 'Prohibited' ? '✗' : `${pairing.coi.coi}%`;

        return (
          <Path
            key={pairing.id}
            d={path}
            stroke={color}
            strokeWidth={pairing.status === 'Prohibited' ? 2.5 : 2}
            fill="none"
            strokeDasharray={dash}
            opacity={pairing.status === 'Completed' ? 0.55 : 1}
          />
        );
      })}
      {segments.map(({ pairing, from, to }) => {
        const mx = (from.x + from.width / 2 + to.x + to.width / 2) / 2;
        const my = (from.y + to.y + to.height) / 2;
        const color = strokeColor(pairing);
        const label = pairing.status === 'Prohibited' ? '✗' : `${pairing.coi.coi}%`;
        const w = 36;
        const h = 16;
        return (
          <Rect
            key={`${pairing.id}-pill`}
            x={mx - w / 2}
            y={my - h / 2}
            width={w}
            height={h}
            rx={8}
            fill="#1C1A0E"
            stroke={color}
            strokeWidth={1}
          />
        );
      })}
      {segments.map(({ pairing, from, to }) => {
        const mx = (from.x + from.width / 2 + to.x + to.width / 2) / 2;
        const my = (from.y + to.y + to.height) / 2;
        const label = pairing.status === 'Prohibited' ? '✗' : `${pairing.coi.coi}%`;
        return (
          <SvgText
            key={`${pairing.id}-txt`}
            x={mx}
            y={my + 4}
            fill="#F5F0E8"
            fontSize={9}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function buildLineSegments(
  pairings: PairingWithCoi[],
  positions: Map<string, CardLayout>,
): LineSegment[] {
  const out: LineSegment[] = [];
  for (const p of pairings) {
    if (p.status === 'Cancelled') continue;
    const from = positions.get(`dam-${p.dam_id}`);
    const to = positions.get(`sire-${p.sire_id}`);
    if (from && to) out.push({ pairing: p, from, to });
  }
  return out;
}
