"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KIND_COLORS } from "@/lib/colors";

type KindItem = { kind: string; kind_zh: string; count: number };
type ProjectItem = {
  project: string;
  count: number;
  bounty: number;
  avgScore: number;
};
type ScoreItem = {
  name: string;
  fullTitle: string;
  score: number;
  project: string;
  kind: string;
  kind_zh: string;
};
type StarItem = { project: string; stars: number; openIssues: number };

const tooltipStyle = {
  background: "#0d1824",
  border: "1px solid rgba(232,184,74,0.25)",
  borderRadius: 12,
  color: "#e8eef6",
};

export function KindPieChart({ data }: { data: KindItem[] }) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="kind_zh"
            innerRadius={58}
            outerRadius={100}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((item) => (
              <Cell key={item.kind} fill={KIND_COLORS[item.kind] ?? "#8B9BB4"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, _name, props) => [
              `${value} 条`,
              props.payload.kind_zh,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProjectBarChart({ data }: { data: ProjectItem[] }) {
  return (
    <div className="chart-box tall">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 12 }}>
          <CartesianGrid stroke="rgba(143,160,181,0.12)" horizontal={false} />
          <XAxis type="number" stroke="#8fa0b5" fontSize={12} />
          <YAxis
            type="category"
            dataKey="project"
            width={100}
            stroke="#8fa0b5"
            fontSize={12}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [
              value,
              name === "count" ? "机会数" : name === "bounty" ? "奖金类" : name,
            ]}
          />
          <Bar dataKey="count" name="机会数" fill="#5B8DEF" radius={[0, 8, 8, 0]} />
          <Bar dataKey="bounty" name="奖金类" fill="#E8B84A" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopScoreChart({ data }: { data: ScoreItem[] }) {
  return (
    <div className="chart-box tall">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, bottom: 48 }}>
          <CartesianGrid stroke="rgba(143,160,181,0.12)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#8fa0b5"
            fontSize={11}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={70}
          />
          <YAxis stroke="#8fa0b5" fontSize={12} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle ?? ""}
            formatter={(value: number, _n, props) => [
              value,
              `${props.payload.project} · ${props.payload.kind_zh}`,
            ]}
          />
          <Bar dataKey="score" radius={[8, 8, 0, 0]}>
            {data.map((item) => (
              <Cell key={item.fullTitle} fill={KIND_COLORS[item.kind] ?? "#E8B84A"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StarsChart({ data }: { data: StarItem[] }) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid stroke="rgba(143,160,181,0.12)" vertical={false} />
          <XAxis dataKey="project" stroke="#8fa0b5" fontSize={12} />
          <YAxis stroke="#8fa0b5" fontSize={12} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [
              value,
              name === "stars" ? "Stars" : "Open Issues",
            ]}
          />
          <Bar dataKey="stars" fill="#3DDC97" radius={[8, 8, 0, 0]} />
          <Bar dataKey="openIssues" fill="#FF7A59" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
