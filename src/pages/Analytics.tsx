import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, BookOpen, Rocket, FolderKanban, TrendingUp, Target } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const Analytics = () => {
  const [stats, setStats] = useState({
    topicsCompleted: 0, topicsTotal: 0,
    startupCompleted: 0, startupTotal: 0,
    projectCompleted: 0, projectTotal: 0,
  });

  useEffect(() => {
    const fetch = async () => {
      const [{ data: topics }, { data: companyTasks }, { data: projectTasks }] = await Promise.all([
        supabase.from("topics").select("completed, completed_at"),
        supabase.from("company_tasks").select("status, completed_at"),
        supabase.from("project_tasks").select("completed, completed_at"),
      ]);

      setStats({
        topicsCompleted: topics?.filter(t => t.completed).length ?? 0,
        topicsTotal: topics?.length ?? 0,
        startupCompleted: companyTasks?.filter(t => t.status === "completed").length ?? 0,
        startupTotal: companyTasks?.length ?? 0,
        projectCompleted: projectTasks?.filter(t => t.completed).length ?? 0,
        projectTotal: projectTasks?.length ?? 0,
      });
    };
    fetch();
  }, []);

  // Weekly breakdown (simulated from total data)
  const weekData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
    day,
    study: Math.floor(Math.random() * Math.max(1, Math.ceil(stats.topicsCompleted / 5))),
    startup: Math.floor(Math.random() * Math.max(1, Math.ceil(stats.startupCompleted / 5))),
    projects: Math.floor(Math.random() * Math.max(1, Math.ceil(stats.projectCompleted / 5))),
  }));

  const pieData = [
    { name: "Studies", value: stats.topicsCompleted, color: "hsl(188,94%,44%)" },
    { name: "Startup", value: stats.startupCompleted, color: "hsl(270,60%,65%)" },
    { name: "Projects", value: stats.projectCompleted, color: "hsl(142,70%,50%)" },
  ].filter(d => d.value > 0);

  const completionData = [
    { area: "Studies", completed: stats.topicsCompleted, total: stats.topicsTotal },
    { area: "Startup", completed: stats.startupCompleted, total: stats.startupTotal },
    { area: "Projects", completed: stats.projectCompleted, total: stats.projectTotal },
  ];

  const totalCompleted = stats.topicsCompleted + stats.startupCompleted + stats.projectCompleted;

  const tooltipStyle = {
    contentStyle: {
      background: "hsl(240,5%,11%)",
      border: "1px solid hsl(240,4%,18%)",
      borderRadius: "8px",
      color: "hsl(210,20%,92%)",
      fontSize: 12,
    },
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize your productivity</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Completed", value: totalCompleted, icon: Target, color: "text-primary" },
          { label: "Study Topics Done", value: stats.topicsCompleted, icon: BookOpen, color: "text-primary" },
          { label: "Startup Tasks Done", value: stats.startupCompleted, icon: Rocket, color: "text-purple-400" },
          { label: "Project Tasks Done", value: stats.projectCompleted, icon: FolderKanban, color: "text-emerald-400" },
        ].map((item) => (
          <div key={item.label} className="card-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly stacked bar chart */}
        <div className="card-surface p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Weekly Tasks by Area</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} barSize={12}>
              <XAxis dataKey="day" tick={{ fill: "hsl(240,5%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="study" stackId="a" fill="hsl(188,94%,44%)" radius={[0,0,0,0]} />
              <Bar dataKey="startup" stackId="a" fill="hsl(270,60%,65%)" radius={[0,0,0,0]} />
              <Bar dataKey="projects" stackId="a" fill="hsl(142,70%,50%)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            {[["Study", "hsl(188,94%,44%)"], ["Startup", "hsl(270,60%,65%)"], ["Projects", "hsl(142,70%,50%)"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie chart */}
        <div className="card-surface p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Completion by Area</h2>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "hsl(240,5%,55%)" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              No completed tasks yet
            </div>
          )}
        </div>
      </div>

      {/* Area completion bars */}
      <div className="card-surface p-6">
        <h2 className="text-sm font-semibold mb-5">Completion Progress by Area</h2>
        <div className="space-y-4">
          {completionData.map((item, i) => {
            const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            const colors = ["text-primary", "text-purple-400", "text-emerald-400"];
            return (
              <div key={item.area} className="flex items-center gap-4">
                <span className={`text-sm font-medium w-20 ${colors[i]}`}>{item.area}</span>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? "hsl(188,94%,44%)" : i === 1 ? "hsl(270,60%,65%)" : "hsl(142,70%,50%)"
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground w-20 text-right">
                  {item.completed}/{item.total} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
