"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StoredSession } from "@/lib/session-store";

interface TrendChartProps {
  sessions: StoredSession[];
}

export function TrendChart({ sessions }: TrendChartProps) {
  if (sessions.length === 0) {
    return (
      <div className="glass-input rounded-2xl border border-white/20 p-8 text-center">
        <p className="text-sm text-gray-400">
          Complete an interview to see your trend.
        </p>
      </div>
    );
  }

  const data = [...sessions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: s.overall_score,
    }));

  return (
    <div className="glass-input rounded-2xl border border-white/20 p-6">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">
        Score trend
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(13,13,13,0.92)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgb(255,240,213)" }}
              itemStyle={{ color: "rgb(255,240,213)" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="rgb(255,240,213)"
              strokeWidth={2}
              dot={{ fill: "rgb(255,240,213)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
