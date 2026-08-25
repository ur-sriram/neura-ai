import React from 'react';

// Reusable SVG Bar Chart
interface BarChartProps {
  data: { label: string; value: number; secondaryValue?: number }[];
  height?: number;
  barColor?: string;
  secondaryColor?: string;
  unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 180,
  barColor = '#0259a1',
  secondaryColor = '#10b981',
  unit = '',
}) => {
  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-3 justify-between pt-6 pb-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          const secondaryHeight = item.secondaryValue ? (item.secondaryValue / maxValue) * 100 : 0;

          return (
            <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                {item.label}: {item.value} {unit}
                {item.secondaryValue !== undefined && ` / ${item.secondaryValue} ${unit}`}
              </div>

              <div className="w-full flex items-end justify-center gap-1 h-full">
                {/* Main Bar */}
                <div
                  className="w-full max-w-[20px] rounded-t transition-all duration-500 hover:opacity-85"
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                    backgroundColor: barColor,
                  }}
                />
                {/* Secondary Bar if present */}
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full max-w-[20px] rounded-t transition-all duration-500 hover:opacity-85"
                    style={{
                      height: `${Math.max(secondaryHeight, 4)}%`,
                      backgroundColor: secondaryColor,
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Reusable SVG Line Trend Chart
interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  unit?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 160,
  strokeColor = '#0259a1',
  fillColor = 'rgba(2, 89, 161, 0.1)',
  unit = '',
}) => {
  if (!data || data.length === 0) return null;

  const width = 500;
  const paddingY = 20;
  const paddingX = 20;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.value - minValue) / range) * (height - 2 * paddingY);
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.reduce((acc, p, index) => {
    return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={width - paddingX}
          y2={paddingY}
          stroke="#f1f5f9"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke="#f1f5f9"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#e2e8f0"
        />

        {/* Fill Area */}
        <path d={areaD} fill={fillColor} />

        {/* Line Path */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Points */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke={strokeColor} strokeWidth="2.5" />
            <circle
              cx={p.x}
              cy={p.y}
              r="7"
              fill={strokeColor}
              className="opacity-0 group-hover:opacity-30 transition-opacity"
            />
            {/* Value label */}
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="text-[10px] fill-slate-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {p.value} {unit}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-2 text-[10px] text-slate-400 font-medium mt-1">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
};

// Reusable SVG Donut Breakdown Chart
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 140,
  centerLabel,
  centerValue,
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const radius = 52;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {data.map((item, index) => {
            const percent = item.value / total;
            const strokeDashoffset = circumference * (1 - percent);
            const rotation = accumulatedPercent * 360;
            accumulatedPercent += percent;

            return (
              <circle
                key={index}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(${rotation} 70 70)`}
                className="transition-all duration-500 hover:opacity-85"
              />
            );
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="text-base font-extrabold text-slate-800 leading-none">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{centerLabel}</span>}
          </div>
        )}
      </div>

      <div className="space-y-1.5 flex-1 min-w-0">
        {data.map((item, index) => {
          const percent = Math.round((item.value / total) * 100);
          return (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium truncate">{item.label}</span>
              </div>
              <span className="font-bold text-slate-800 ml-2">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
