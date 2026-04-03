'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Item = { date: string; score: number; label: string; summary: string };

type Props = {
  data: Item[];
};

const dotColor = (label: string) => {
  if (label === 'happy') return '#10b981';
  if (label === 'low') return '#f59e0b';
  if (label === 'distressed') return '#ef4444';
  return '#9ca3af';
};

export default function MoodChart({ data }: Props) {
  const scores = data.map((item) => item.score);
  const low = scores.length ? Math.min(...scores) : 0;
  const high = scores.length ? Math.max(...scores) : 0;

  return (
    <div className="soft-card p-4">
      <h3 className="mb-1 text-lg font-semibold">7-Day Mood Trend</h3>
      <p className="mb-4 text-sm text-gray-400">Range this week: {low.toFixed(1)} to {high.toFixed(1)}</p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#6b7280" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 10]} stroke="#6b7280" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12 }}
              formatter={(value) => [`${value}/10`, 'Mood']}
              labelFormatter={(label, payload) => {
                const summary = payload?.[0]?.payload?.summary;
                return `${label}${summary ? ` — ${summary}` : ''}`;
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#moodGradient)"
              animationDuration={1500}
              animationEasing="ease-out"
              dot={(props) => {
                const color = dotColor((props.payload as Item).label);
                return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#0a0a0f" strokeWidth={2} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
