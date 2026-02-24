import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getUserName, getOtherUserName } from "@/lib/userNames";
import { BarChart3, BookOpen, Rocket, FolderKanban, TrendingUp, Target, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { startOfWeek, addDays, isWithinInterval, parseISO } from "date-fns";

const USER_IDS = [
  "3abc2ab8-0aea-47d1-9666-b31ba0978f5f",
  "cf758728-b3c1-4b9e-8065-7cb9208a7003",
];

interface UserStats {
  userId: string;
  name: string;
  topicsCompleted: number;
  topicsTotal: number;
  startupCompleted: number;
  startupTotal: number;
  projectCompleted: number;
  projectTotal: number;
  weekData: { day: string; study: number; startup: number; projects: number }[];
}

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const buildWeekByArea = (
  studyDates: (string | null)[],
  startupDates: (string | null)[],
  projectDates: (string | null)[]
) => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const study = new Array(7).fill(0);
  const startup = new Array(7).fill(0);
  const projects = new Array(7).fill(0);

  const count = (dates: (string | null)[], arr: number[]) => {
    dates.forEach((d) => {
      if (!d) return;
      const date = parseISO(d);
      if (isWithinInterval(date, { start: weekStart, end: addDays(weekEnd, 1) })) {
        arr[(date.getDay() + 6) % 7]++;
      }
    });
  };

  count(studyDates, study);
  count(startupDates, startup);
  count(projectDates, projects);

  return weekDayLabels.map((day, i) => ({ day, study: study[i], startup: startup[i], projects: projects[i] }));
};

const tooltipStyle = {
  contentStyle: {
    background: "hsl(240,5%,11%)",
    border: "1px solid hsl(240,4%,18%)",
    borderRadius: "8px",
    color: "hsl(210,20%,92%)",
    fontSize: 12,
  },
};

const Analytics = () => {
  const { user } = useAuth();
  const [usersStats, setUsersStats] = useState<UserStats[]>([]);
  const [sharedStartup, setSharedStartup] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: subjects }, { data: chapters }, { data: topics }, { data: companyTasks }, { data: projects }, { data: projectTasks }] = await Promise.all([
        supabase.from("subjects").select("id, user_id"),
        supabase.from("chapters").select("id, subject_id"),
        supabase.from("topics").select("completed, completed_at, chapter_id"),
        supabase.from("company_tasks").select("status, completed_at"),
        supabase.from("projects").select("id, user_id"),
        supabase.from("project_tasks").select("completed, completed_at, project_id"),
      ]);

      const startupCompleted = companyTasks?.filter(t => t.status === "completed").length ?? 0;
      const startupTotal = companyTasks?.length ?? 0;
      const startupDates = (companyTasks || []).filter(t => t.status === "completed").map(t => t.completed_at);
      setSharedStartup({ completed: startupCompleted, total: startupTotal });

      const stats: UserStats[] = USER_IDS.map((uid) => {
        const userSubjectIds = new Set((subjects || []).filter(s => s.user_id === uid).map(s => s.id));
        const userChapterIds = new Set((chapters || []).filter(c => userSubjectIds.has(c.subject_id!)).map(c => c.id));
        const userTopics = (topics || []).filter(t => userChapterIds.has(t.chapter_id!));

        const userProjectIds = new Set((projects || []).filter(p => p.user_id === uid).map(p => p.id));
        const userProjectTasks = (projectTasks || []).filter(t => userProjectIds.has(t.project_id!));

        const studyDates = userTopics.filter(t => t.completed).map(t => t.completed_at);
        const projDates = userProjectTasks.filter(t => t.completed).map(t => t.completed_at);

        return {
          userId: uid,
          name: getUserName(uid),
          topicsCompleted: userTopics.filter(t => t.completed).length,
          topicsTotal: userTopics.length,
          startupCompleted,
          startupTotal,
          projectCompleted: userProjectTasks.filter(t => t.completed).length,
          projectTotal: userProjectTasks.length,
          weekData: buildWeekByArea(studyDates, startupDates, projDates),
        };
      });

      setUsersStats(stats);
    };
    fetchData();
  }, [user]);

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track individual progress · Startup stats are shared
        </p>
      </div>

      {/* Shared Startup Summary */}
      <div className="card-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold">Startup Tasks (Shared)</h2>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-2xl font-bold">{sharedStartup.completed}/{sharedStartup.total}</p>
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${sharedStartup.total > 0 ? Math.round((sharedStartup.completed / sharedStartup.total) * 100) : 0}%`,
                  background: "hsl(270,60%,65%)"
                }}
              />
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {sharedStartup.total > 0 ? Math.round((sharedStartup.completed / sharedStartup.total) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Per-user analytics */}
      {usersStats.map((us) => {
        const totalPersonal = us.topicsCompleted + us.projectCompleted;

        const pieData = [
          { name: "Studies", value: us.topicsCompleted, color: "hsl(188,94%,44%)" },
          { name: "Projects", value: us.projectCompleted, color: "hsl(142,70%,50%)" },
        ].filter(d => d.value > 0);

        const isCurrentUser = us.userId === user?.id;

        return (
          <div key={us.userId} className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-bold">{us.name}'s Progress</h2>
              {isCurrentUser && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">You</span>}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Study Topics", value: us.topicsCompleted, total: us.topicsTotal, icon: BookOpen, color: "text-primary" },
                { label: "Project Tasks", value: us.projectCompleted, total: us.projectTotal, icon: FolderKanban, color: "text-emerald-400" },
                { label: "Total Personal", value: totalPersonal, total: us.topicsTotal + us.projectTotal, icon: Target, color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="card-surface p-4">
                  <div className="flex items-center justify-between mb-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%</span>
                  </div>
                  <p className="text-2xl font-bold">{item.value}<span className="text-sm text-muted-foreground font-normal">/{item.total}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly chart */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">This Week</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={us.weekData} barSize={10}>
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

              {/* Pie */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Completion Breakdown</h3>
                </div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "hsl(240,5%,55%)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                    No completed tasks yet
                  </div>
                )}
              </div>
            </div>

            {/* Progress bars */}
            <div className="card-surface p-6">
              <h3 className="text-sm font-semibold mb-4">Completion Progress</h3>
              <div className="space-y-3">
                {[
                  { area: "Studies", completed: us.topicsCompleted, total: us.topicsTotal, barColor: "hsl(188,94%,44%)", textColor: "text-primary" },
                  { area: "Projects", completed: us.projectCompleted, total: us.projectTotal, barColor: "hsl(142,70%,50%)", textColor: "text-emerald-400" },
                ].map((item) => {
                  const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
                  return (
                    <div key={item.area} className="flex items-center gap-4">
                      <span className={`text-sm font-medium w-20 ${item.textColor}`}>{item.area}</span>
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.barColor }} />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground w-20 text-right">{item.completed}/{item.total} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Analytics;
