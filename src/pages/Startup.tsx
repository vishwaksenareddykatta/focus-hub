import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ChevronRight, ChevronDown, Rocket, Users, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TeamMember = { id: string; name: string; role: string | null; company_id: string | null };
type CompanyTask = {
  id: string; title: string; description: string | null;
  status: string | null; progress: number | null;
  assigned_to: string | null; company_id: string | null;
};
type Company = { id: string; name: string; description: string | null; members: TeamMember[]; tasks: CompanyTask[] };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-400/10",
  "in-progress": "text-primary bg-primary/10",
  completed: "text-emerald-400 bg-emerald-400/10",
};

const Startup = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState({ name: "", description: "" });
  const [newMember, setNewMember] = useState({ name: "", role: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_to: "", status: "pending", progress: 0 });

  const fetchData = async () => {
    const [{ data: companies }, { data: members }, { data: tasks }] = await Promise.all([
      supabase.from("companies").select("*").order("created_at"),
      supabase.from("team_members").select("*").order("name"),
      supabase.from("company_tasks").select("*").order("created_at"),
    ]);
    if (!companies) return;
    setCompanies(companies.map((c) => ({
      ...c,
      members: (members || []).filter((m) => m.company_id === c.id),
      tasks: (tasks || []).filter((t) => t.company_id === c.id),
    })));
  };

  useEffect(() => { fetchData(); }, []);

  const addCompany = async () => {
    if (!newCompany.name.trim()) return;
    await supabase.from("companies").insert({ name: newCompany.name, description: newCompany.description || null });
    setNewCompany({ name: "", description: "" });
    setAddCompanyOpen(false);
    fetchData();
  };

  const addMember = async (companyId: string) => {
    if (!newMember.name.trim()) return;
    await supabase.from("team_members").insert({ name: newMember.name, role: newMember.role || null, company_id: companyId });
    setNewMember({ name: "", role: "" });
    setAddMemberOpen(null);
    fetchData();
  };

  const addTask = async (companyId: string) => {
    if (!newTask.title.trim()) return;
    await supabase.from("company_tasks").insert({
      title: newTask.title,
      description: newTask.description || null,
      assigned_to: newTask.assigned_to || null,
      status: newTask.status,
      progress: newTask.progress,
      company_id: companyId,
    });
    setNewTask({ title: "", description: "", assigned_to: "", status: "pending", progress: 0 });
    setAddTaskOpen(null);
    fetchData();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const completed_at = status === "completed" ? new Date().toISOString() : null;
    const progress = status === "completed" ? 100 : status === "in-progress" ? 50 : 0;
    await supabase.from("company_tasks").update({ status, progress, completed_at }).eq("id", taskId);
    fetchData();
  };

  const deleteCompany = async (id: string) => {
    await supabase.from("companies").delete().eq("id", id);
    fetchData();
  };

  const companyProgress = (company: Company) => {
    if (company.tasks.length === 0) return 0;
    const completed = company.tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / company.tasks.length) * 100);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Startup</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your companies and teams</p>
        </div>
        <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground glow-sm hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
            <Input placeholder="Company name" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className="bg-muted border-border" />
            <Textarea placeholder="Description (optional)" value={newCompany.description} onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })} className="bg-muted border-border" />
            <Button onClick={addCompany} className="gradient-primary text-primary-foreground">Add Company</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {companies.length === 0 && (
          <div className="card-surface p-12 text-center text-muted-foreground">
            <Rocket className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No companies yet. Add your first company.</p>
          </div>
        )}

        {companies.map((company) => {
          const pct = companyProgress(company);
          const isExpanded = expanded.has(company.id);

          return (
            <div key={company.id} className="card-surface overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => {
                  const next = new Set(expanded);
                  isExpanded ? next.delete(company.id) : next.add(company.id);
                  setExpanded(next);
                }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <Rocket className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <p className="font-medium">{company.name}</p>
                  {company.description && <p className="text-xs text-muted-foreground">{company.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground mr-2">{pct}% · {company.members.length} members</span>
                <div className="w-20"><Progress value={pct} className="h-1.5" /></div>
                <button onClick={(e) => { e.stopPropagation(); deleteCompany(company.id); }} className="ml-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-5">
                  {/* Team Members */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5" /> Team Members
                      </div>
                      <Dialog open={addMemberOpen === company.id} onOpenChange={(o) => setAddMemberOpen(o ? company.id : null)}>
                        <DialogTrigger asChild>
                          <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Add Member
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
                          <Input placeholder="Name" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className="bg-muted border-border" />
                          <Input placeholder="Role (optional)" value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className="bg-muted border-border" />
                          <Button onClick={() => addMember(company.id)} className="gradient-primary text-primary-foreground">Add Member</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {company.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                            {m.name[0]}
                          </div>
                          <span className="text-xs font-medium">{m.name}</span>
                          {m.role && <span className="text-xs text-muted-foreground">· {m.role}</span>}
                        </div>
                      ))}
                      {company.members.length === 0 && <p className="text-xs text-muted-foreground">No team members yet</p>}
                    </div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</div>
                      <Dialog open={addTaskOpen === company.id} onOpenChange={(o) => setAddTaskOpen(o ? company.id : null)}>
                        <DialogTrigger asChild>
                          <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Add Task
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                          <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-muted border-border" />
                          <Textarea placeholder="Description (optional)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="bg-muted border-border" />
                          <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                            <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Assign to member" /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {company.members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={newTask.status} onValueChange={(v) => setNewTask({ ...newTask, status: v })}>
                            <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={() => addTask(company.id)} className="gradient-primary text-primary-foreground">Add Task</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {company.tasks.map((task) => {
                        const member = company.members.find((m) => m.id === task.assigned_to);
                        return (
                          <div key={task.id} className="bg-muted rounded-lg p-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              {member && <p className="text-xs text-muted-foreground">→ {member.name}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Progress value={task.progress ?? 0} className="w-16 h-1" />
                              <Select value={task.status || "pending"} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                                <SelectTrigger className={cn("h-6 text-xs px-2 border-0 rounded-md", STATUS_COLORS[task.status || "pending"])}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                      {company.tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Startup;
