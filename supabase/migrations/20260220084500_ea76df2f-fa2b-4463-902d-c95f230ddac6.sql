
-- Add user_id to projects
ALTER TABLE public.projects ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to subjects (studies)
ALTER TABLE public.subjects ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Assign all existing data to your account
UPDATE public.projects SET user_id = '3abc2ab8-0aea-47d1-9666-b31ba0978f5f';
UPDATE public.subjects SET user_id = '3abc2ab8-0aea-47d1-9666-b31ba0978f5f';

-- Make user_id NOT NULL after backfill
ALTER TABLE public.projects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.subjects ALTER COLUMN user_id SET NOT NULL;

-- Drop old RLS policies for projects
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;

-- Projects: owner can do everything, others can only read
CREATE POLICY "Owner can manage own projects" ON public.projects
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

-- Drop old RLS policies for project_tasks
DROP POLICY IF EXISTS "Authenticated users can manage project_tasks" ON public.project_tasks;

-- Project tasks: owner can manage (via project), others read-only
CREATE POLICY "Owner can manage own project tasks" ON public.project_tasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_tasks.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_tasks.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Authenticated users can view all project tasks" ON public.project_tasks
  FOR SELECT TO authenticated USING (true);

-- Drop old RLS policies for subjects
DROP POLICY IF EXISTS "Authenticated users can manage subjects" ON public.subjects;

-- Subjects: owner can do everything, others can only read
CREATE POLICY "Owner can manage own subjects" ON public.subjects
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);

-- Drop old RLS policies for chapters
DROP POLICY IF EXISTS "Authenticated users can manage chapters" ON public.chapters;

-- Chapters: owner can manage (via subject), others read-only
CREATE POLICY "Owner can manage own chapters" ON public.chapters
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = chapters.subject_id AND subjects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = chapters.subject_id AND subjects.user_id = auth.uid()));

CREATE POLICY "Authenticated users can view all chapters" ON public.chapters
  FOR SELECT TO authenticated USING (true);

-- Drop old RLS policies for topics
DROP POLICY IF EXISTS "Authenticated users can manage topics" ON public.topics;

-- Topics: owner can manage (via chapter->subject), others read-only
CREATE POLICY "Owner can manage own topics" ON public.topics
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chapters
    JOIN public.subjects ON subjects.id = chapters.subject_id
    WHERE chapters.id = topics.chapter_id AND subjects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chapters
    JOIN public.subjects ON subjects.id = chapters.subject_id
    WHERE chapters.id = topics.chapter_id AND subjects.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can view all topics" ON public.topics
  FOR SELECT TO authenticated USING (true);
