import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ChevronRight, ChevronDown, BookOpen, Trash2, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Topic = {
  id: string;
  name: string;
  completed: boolean | null;
  completed_at: string | null;
  notes: string | null;
  chapter_id: string | null;
};

type Chapter = {
  id: string;
  name: string;
  subject_id: string | null;
  topics: Topic[];
};

type Subject = {
  id: string;
  name: string;
  chapters: Chapter[];
};

const Studies = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [addChapterOpen, setAddChapterOpen] = useState<string | null>(null);
  const [addTopicOpen, setAddTopicOpen] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [editNotes, setEditNotes] = useState<{ id: string; notes: string } | null>(null);

  const fetchData = async () => {
    const { data: subjects } = await supabase.from("subjects").select("*").order("created_at");
    const { data: chapters } = await supabase.from("chapters").select("*").order("created_at");
    const { data: topics } = await supabase.from("topics").select("*").order("name");

    if (!subjects) return;

    const mapped: Subject[] = subjects.map((s) => ({
      ...s,
      chapters: (chapters || [])
        .filter((c) => c.subject_id === s.id)
        .map((c) => ({
          ...c,
          topics: (topics || []).filter((t) => t.chapter_id === c.id),
        })),
    }));

    setSubjects(mapped);
  };

  useEffect(() => { fetchData(); }, []);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    await supabase.from("subjects").insert({ name: newSubjectName.trim() });
    setNewSubjectName("");
    setAddSubjectOpen(false);
    fetchData();
  };

  const addChapter = async (subjectId: string) => {
    if (!newChapterName.trim()) return;
    await supabase.from("chapters").insert({ name: newChapterName.trim(), subject_id: subjectId });
    setNewChapterName("");
    setAddChapterOpen(null);
    fetchData();
  };

  const addTopic = async (chapterId: string) => {
    if (!newTopicName.trim()) return;
    await supabase.from("topics").insert({ name: newTopicName.trim(), chapter_id: chapterId });
    setNewTopicName("");
    setAddTopicOpen(null);
    fetchData();
  };

  const toggleTopic = async (topic: Topic) => {
    const completed = !topic.completed;
    await supabase.from("topics").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", topic.id);
    fetchData();
  };

  const saveNotes = async () => {
    if (!editNotes) return;
    await supabase.from("topics").update({ notes: editNotes.notes }).eq("id", editNotes.id);
    setEditNotes(null);
    fetchData();
  };

  const deleteSubject = async (id: string) => {
    await supabase.from("subjects").delete().eq("id", id);
    fetchData();
  };

  const subjectCompletion = (subject: Subject) => {
    const topics = subject.chapters.flatMap((c) => c.topics);
    if (topics.length === 0) return 0;
    return Math.round((topics.filter((t) => t.completed).length / topics.length) * 100);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Studies</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your learning progress</p>
        </div>
        <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground glow-sm hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
            <Input placeholder="Subject name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="bg-muted border-border" onKeyDown={(e) => e.key === "Enter" && addSubject()} />
            <Button onClick={addSubject} className="gradient-primary text-primary-foreground">Add Subject</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {subjects.length === 0 && (
          <div className="card-surface p-12 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No subjects yet. Add your first subject to get started.</p>
          </div>
        )}

        {subjects.map((subject) => {
          const pct = subjectCompletion(subject);
          const isExpanded = expandedSubjects.has(subject.id);

          return (
            <div key={subject.id} className="card-surface overflow-hidden">
              {/* Subject header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => {
                  const next = new Set(expandedSubjects);
                  isExpanded ? next.delete(subject.id) : next.add(subject.id);
                  setExpandedSubjects(next);
                }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-medium flex-1">{subject.name}</span>
                <span className="text-xs text-muted-foreground mr-2">{pct}%</span>
                <div className="w-20"><Progress value={pct} className="h-1.5" /></div>
                <button onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }} className="ml-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chapters */}
              {isExpanded && (
                <div className="border-t border-border">
                  {subject.chapters.map((chapter) => {
                    const chapterExpanded = expandedChapters.has(chapter.id);
                    const chapterPct = chapter.topics.length > 0
                      ? Math.round((chapter.topics.filter((t) => t.completed).length / chapter.topics.length) * 100)
                      : 0;

                    return (
                      <div key={chapter.id} className="border-b border-border last:border-0">
                        <div
                          className="flex items-center gap-3 px-8 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => {
                            const next = new Set(expandedChapters);
                            chapterExpanded ? next.delete(chapter.id) : next.add(chapter.id);
                            setExpandedChapters(next);
                          }}
                        >
                          {chapterExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-sm font-medium flex-1">{chapter.name}</span>
                          <span className="text-xs text-muted-foreground mr-2">{chapterPct}% · {chapter.topics.length} topics</span>
                        </div>

                        {chapterExpanded && (
                          <div className="px-12 pb-3 space-y-1">
                            {chapter.topics.map((topic) => (
                              <div key={topic.id} className="flex items-center gap-3 py-2 group">
                                <button
                                  onClick={() => toggleTopic(topic)}
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                                    topic.completed
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground/40 hover:border-primary"
                                  )}
                                >
                                  {topic.completed && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                </button>
                                <span className={cn("text-sm flex-1", topic.completed && "line-through text-muted-foreground")}>
                                  {topic.name}
                                </span>
                                {topic.completed_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(topic.completed_at).toLocaleDateString()}
                                  </span>
                                )}
                                <button
                                  onClick={() => setEditNotes({ id: topic.id, notes: topic.notes || "" })}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            {/* Add Topic */}
                            <Dialog open={addTopicOpen === chapter.id} onOpenChange={(o) => setAddTopicOpen(o ? chapter.id : null)}>
                              <DialogTrigger asChild>
                                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1 mt-1">
                                  <Plus className="w-3 h-3" /> Add Topic
                                </button>
                              </DialogTrigger>
                              <DialogContent className="bg-card border-border">
                                <DialogHeader><DialogTitle>Add Topic</DialogTitle></DialogHeader>
                                <Input placeholder="Topic name" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} className="bg-muted border-border" onKeyDown={(e) => e.key === "Enter" && addTopic(chapter.id)} />
                                <Button onClick={() => addTopic(chapter.id)} className="gradient-primary text-primary-foreground">Add Topic</Button>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Chapter */}
                  <div className="px-8 py-3">
                    <Dialog open={addChapterOpen === subject.id} onOpenChange={(o) => setAddChapterOpen(o ? subject.id : null)}>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Plus className="w-3 h-3" /> Add Chapter
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader><DialogTitle>Add Chapter to {subject.name}</DialogTitle></DialogHeader>
                        <Input placeholder="Chapter name" value={newChapterName} onChange={(e) => setNewChapterName(e.target.value)} className="bg-muted border-border" onKeyDown={(e) => e.key === "Enter" && addChapter(subject.id)} />
                        <Button onClick={() => addChapter(subject.id)} className="gradient-primary text-primary-foreground">Add Chapter</Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes dialog */}
      <Dialog open={!!editNotes} onOpenChange={(o) => !o && setEditNotes(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Topic Notes</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Add notes..."
            value={editNotes?.notes || ""}
            onChange={(e) => setEditNotes((n) => n ? { ...n, notes: e.target.value } : null)}
            className="bg-muted border-border min-h-[120px]"
          />
          <Button onClick={saveNotes} className="gradient-primary text-primary-foreground">Save Notes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Studies;
