import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ChevronRight, ChevronDown, FolderKanban, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProjectTask = { id: string; title: string; description: string | null; completed: boolean | null; project_id: string | null };
type Project = { id: string; name: string; description: string | null; status: string | null; future_plans: string | null; tasks: ProjectTask[] };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: "Planning", color: "text-amber-400 bg-amber-400/10" },
  "in-progress": { label: "In Progress", color: "text-primary bg-primary/10" },
  completed: { label: "Completed", color: "text-emerald-400 bg-emerald-400/10" },
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "", status: "planning", future_plans: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "" });

  const fetchData = async () => {
    const [{ data: projects }, { data: tasks }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at"),
      supabase.from("project_tasks").select("*").order("created_at"),
    ]);
    if (!projects) return;
    setProjects(projects.map((p) => ({
      ...p,
      tasks: (tasks || []).filter((t) => t.project_id === p.id),
    })));
  };

  useEffect(() => { fetchData(); }, []);

  const addProject = async () => {
    if (!newProject.name.trim()) return;
    await supabase.from("projects").insert({
      name: newProject.name,
      description: newProject.description || null,
      status: newProject.status,
      future_plans: newProject.future_plans || null,
    });
    setNewProject({ name: "", description: "", status: "planning", future_plans: "" });
    setAddProjectOpen(false);
    fetchData();
  };

  const addTask = async (projectId: string) => {
    if (!newTask.title.trim()) return;
    await supabase.from("project_tasks").insert({
      title: newTask.title,
      description: newTask.description || null,
      project_id: projectId,
    });
    setNewTask({ title: "", description: "" });
    setAddTaskOpen(null);
    fetchData();
  };

  const toggleTask = async (task: ProjectTask) => {
    const completed = !task.completed;
    await supabase.from("project_tasks").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", task.id);
    fetchData();
  };

  const updateProjectStatus = async (projectId: string, status: string) => {
    await supabase.from("projects").update({ status }).eq("id", projectId);
    fetchData();
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    fetchData();
  };

  const projectCompletion = (project: Project) => {
    if (project.tasks.length === 0) return 0;
    return Math.round((project.tasks.filter((t) => t.completed).length / project.tasks.length) * 100);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your project milestones</p>
        </div>
        <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground glow-sm hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Project</DialogTitle></DialogHeader>
            <Input placeholder="Project name" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} className="bg-muted border-border" />
            <Textarea placeholder="Description (optional)" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} className="bg-muted border-border" />
            <Textarea placeholder="Future plans (optional)" value={newProject.future_plans} onChange={(e) => setNewProject({ ...newProject, future_plans: e.target.value })} className="bg-muted border-border" />
            <Select value={newProject.status} onValueChange={(v) => setNewProject({ ...newProject, status: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addProject} className="gradient-primary text-primary-foreground">Add Project</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {projects.length === 0 && (
          <div className="card-surface p-12 text-center text-muted-foreground">
            <FolderKanban className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No projects yet. Add your first project.</p>
          </div>
        )}

        {projects.map((project) => {
          const pct = projectCompletion(project);
          const isExpanded = expanded.has(project.id);
          const statusCfg = STATUS_CONFIG[project.status || "planning"];

          return (
            <div key={project.id} className="card-surface overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => {
                  const next = new Set(expanded);
                  isExpanded ? next.delete(project.id) : next.add(project.id);
                  setExpanded(next);
                }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <FolderKanban className="w-4 h-4 text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{project.name}</p>
                  {project.description && <p className="text-xs text-muted-foreground truncate">{project.description}</p>}
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusCfg.color)}>
                  {statusCfg.label}
                </span>
                <span className="text-xs text-muted-foreground mr-2 ml-2">{pct}%</span>
                <div className="w-20"><Progress value={pct} className="h-1.5" /></div>
                <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="ml-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {/* Status control */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <Select value={project.status || "planning"} onValueChange={(v) => updateProjectStatus(project.id, v)}>
                      <SelectTrigger className={cn("h-7 text-xs w-auto px-3 border-0", statusCfg.color)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Future plans */}
                  {project.future_plans && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Future Plans</p>
                      <p className="text-sm">{project.future_plans}</p>
                    </div>
                  )}

                  {/* Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Tasks ({project.tasks.filter(t => t.completed).length}/{project.tasks.length})
                      </span>
                      <Dialog open={addTaskOpen === project.id} onOpenChange={(o) => setAddTaskOpen(o ? project.id : null)}>
                        <DialogTrigger asChild>
                          <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Add Task
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader><DialogTitle>Add Task to {project.name}</DialogTitle></DialogHeader>
                          <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-muted border-border" onKeyDown={(e) => e.key === "Enter" && addTask(project.id)} />
                          <Textarea placeholder="Description (optional)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="bg-muted border-border" />
                          <Button onClick={() => addTask(project.id)} className="gradient-primary text-primary-foreground">Add Task</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-1.5">
                      {project.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-2.5 bg-muted rounded-lg group">
                          <button
                            onClick={() => toggleTask(task)}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                              task.completed ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
                            )}
                          >
                            {task.completed && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </button>
                          <span className={cn("text-sm flex-1", task.completed && "line-through text-muted-foreground")}>
                            {task.title}
                          </span>
                          {task.description && <span className="text-xs text-muted-foreground hidden group-hover:block">{task.description}</span>}
                        </div>
                      ))}
                      {project.tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet</p>}
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

export default Projects;
