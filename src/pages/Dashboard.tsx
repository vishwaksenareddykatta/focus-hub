import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Rocket, FolderKanban, TrendingUp, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  topicsCompleted: number;
  topicsTotal: number;
  startupTasksCompleted: number;
  startupTasksTotal: number;
  projectTasksCompleted: number;
  projectTasksTotal: number;
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const generateWeekData = (completed: number) => {
  return weekDays.map((day, i) => ({
    day,
    tasks: Math.max(0, Math.floor((completed / 7) * (0.5 + Math.random()))),
  }));
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  total,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  total: number;
  color: string;
}) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card-surface p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold">{pct}%</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {value} / {total} completed
        </p>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    topicsCompleted: 0,
    topicsTotal: 0,
    startupTasksCompleted: 0,
    startupTasksTotal: 0,
    projectTasksCompleted: 0,
    projectTasksTotal: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [topics, companyTasks, projectTasks] = await Promise.all([
        supabase.from("topics").select("completed"),
        supabase.from("company_tasks").select("status"),
        supabase.from("project_tasks").select("completed"),
      ]);

      setStats({
        topicsCompleted: topics.data?.filter((t) => t.completed).length ?? 0,
        topicsTotal: topics.data?.length ?? 0,
        startupTasksCompleted:
          companyTasks.data?.filter((t) => t.status === "completed").length ?? 0,
        startupTasksTotal: companyTasks.data?.length ?? 0,
        projectTasksCompleted:
          projectTasks.data?.filter((t) => t.completed).length ?? 0,
        projectTasksTotal: projectTasks.data?.length ?? 0,
      });
    };
    fetchStats();
  }, []);

  const weekData = generateWeekData(
    stats.topicsCompleted + stats.startupTasksCompleted + stats.projectTasksCompleted
  );

  const totalCompleted =
    stats.topicsCompleted + stats.startupTasksCompleted + stats.projectTasksCompleted;
  const totalTasks =
    stats.topicsTotal + stats.startupTasksTotal + stats.projectTasksTotal;

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your personal productivity overview
        </p>
      </div>

      {/* Quick summary */}
      <div className="card-surface p-6 flex items-center gap-6">
        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center glow shrink-0">
          <CheckCircle2 className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Overall Completion</p>
          <p className="text-3xl font-bold mt-0.5">
            {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCompleted} of {totalTasks} tasks completed across all areas
          </p>
        </div>
        <div className="w-32">
          <Progress
            value={totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}
            className="h-2"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="Study Topics"
          value={stats.topicsCompleted}
          total={stats.topicsTotal}
          color="bg-primary/15 text-primary"
        />
        <StatCard
          icon={Rocket}
          label="Startup Tasks"
          value={stats.startupTasksCompleted}
          total={stats.startupTasksTotal}
          color="bg-purple-500/15 text-purple-400"
        />
        <StatCard
          icon={FolderKanban}
          label="Project Tasks"
          value={stats.projectTasksCompleted}
          total={stats.projectTasksTotal}
          color="bg-emerald-500/15 text-emerald-400"
        />
      </div>

      {/* Weekly chart */}
      <div className="card-surface p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Weekly Progress</h2>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weekData}>
            <defs>
              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(188,94%,44%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(188,94%,44%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fill: "hsl(240,5%,55%)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "hsl(240,5%,11%)",
                border: "1px solid hsl(240,4%,18%)",
                borderRadius: "8px",
                color: "hsl(210,20%,92%)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="tasks"
              stroke="hsl(188,94%,44%)"
              strokeWidth={2}
              fill="url(#colorTasks)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
