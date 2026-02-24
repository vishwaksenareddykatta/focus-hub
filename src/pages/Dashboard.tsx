import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getUserName } from "@/lib/userNames";
import { BookOpen, Rocket, FolderKanban, TrendingUp, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { startOfWeek, addDays, isWithinInterval, parseISO, format } from "date-fns";

interface DashboardStats {
  topicsCompleted: number;
  topicsTotal: number;
  startupTasksCompleted: number;
  startupTasksTotal: number;
  projectTasksCompleted: number;
  projectTasksTotal: number;
}

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const buildWeekData = (completionDates: (string | null)[]) => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const counts = new Array(7).fill(0);
  completionDates.forEach((d) => {
    if (!d) return;
    const date = parseISO(d);
    if (isWithinInterval(date, { start: weekStart, end: addDays(weekEnd, 1) })) {
      const dayIndex = (date.getDay() + 6) % 7; // Mon=0
      counts[dayIndex]++;
    }
  });

  return weekDayLabels.map((day, i) => ({ day, tasks: counts[i] }));
};

const StatCard = ({
  icon: Icon, label, value, total, color,
}: {
  icon: React.ElementType; label: string; value: number; total: number; color: string;
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
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    topicsCompleted: 0, topicsTotal: 0,
    startupTasksCompleted: 0, startupTasksTotal: 0,
    projectTasksCompleted: 0, projectTasksTotal: 0,
  });
  const [weekData, setWeekData] = useState(weekDayLabels.map((day) => ({ day, tasks: 0 })));

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [{ data: subjects }, { data: chapters }, { data: topics }, { data: companyTasks }, { data: projects }, { data: projectTasks }] = await Promise.all([
        supabase.from("subjects").select("id, user_id"),
        supabase.from("chapters").select("id, subject_id"),
        supabase.from("topics").select("completed, completed_at, chapter_id"),
        supabase.from("company_tasks").select("status, completed_at"),
        supabase.from("projects").select("id, user_id"),
        supabase.from("project_tasks").select("completed, completed_at, project_id"),
      ]);

      const mySubjectIds = new Set((subjects || []).filter(s => s.user_id === user.id).map(s => s.id));
      const myChapterIds = new Set((chapters || []).filter(c => mySubjectIds.has(c.subject_id!)).map(c => c.id));
      const myTopics = (topics || []).filter(t => myChapterIds.has(t.chapter_id!));

      const myProjectIds = new Set((projects || []).filter(p => p.user_id === user.id).map(p => p.id));
      const myProjectTasks = (projectTasks || []).filter(t => myProjectIds.has(t.project_id!));

      setStats({
        topicsCompleted: myTopics.filter(t => t.completed).length,
        topicsTotal: myTopics.length,
        startupTasksCompleted: companyTasks?.filter(t => t.status === "completed").length ?? 0,
        startupTasksTotal: companyTasks?.length ?? 0,
        projectTasksCompleted: myProjectTasks.filter(t => t.completed).length,
        projectTasksTotal: myProjectTasks.length,
      });

      // Build real week data from completion dates
      const allDates = [
        ...myTopics.filter(t => t.completed).map(t => t.completed_at),
        ...(companyTasks || []).filter(t => t.status === "completed").map(t => t.completed_at),
        ...myProjectTasks.filter(t => t.completed).map(t => t.completed_at),
      ];
      setWeekData(buildWeekData(allDates));
    };
    fetchStats();
  }, [user]);

  const totalCompleted = stats.topicsCompleted + stats.startupTasksCompleted + stats.projectTasksCompleted;
  const totalTasks = stats.topicsTotal + stats.startupTasksTotal + stats.projectTasksTotal;
  const displayName = user ? getUserName(user.id) : "";

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal productivity overview</p>
      </div>

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
          <Progress value={totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0} className="h-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={BookOpen} label="My Study Topics" value={stats.topicsCompleted} total={stats.topicsTotal} color="bg-primary/15 text-primary" />
        <StatCard icon={Rocket} label="Startup Tasks (Shared)" value={stats.startupTasksCompleted} total={stats.startupTasksTotal} color="bg-purple-500/15 text-purple-400" />
        <StatCard icon={FolderKanban} label="My Project Tasks" value={stats.projectTasksCompleted} total={stats.projectTasksTotal} color="bg-emerald-500/15 text-emerald-400" />
      </div>

      <div className="card-surface p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">This Week's Activity</h2>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weekData}>
            <defs>
              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(188,94%,44%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(188,94%,44%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: "hsl(240,5%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "hsl(240,5%,11%)", border: "1px solid hsl(240,4%,18%)", borderRadius: "8px", color: "hsl(210,20%,92%)", fontSize: 12 }} />
            <Area type="monotone" dataKey="tasks" stroke="hsl(188,94%,44%)" strokeWidth={2} fill="url(#colorTasks)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
