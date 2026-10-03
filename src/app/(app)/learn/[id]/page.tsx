"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { LessonReader } from "@/components/shared/lesson-reader";
import { getLesson, lessonsForPath, pathForLesson } from "@/content/shared/lessons";
import { useUser } from "@/lib/hooks/use-user";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useUser();
  const lesson = getLesson(params?.id);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!lesson || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <p className="text-sm text-muted">That lesson doesn&apos;t exist.</p>
        <Link href="/learn" className="text-sm text-accent hover:underline">Back to lessons</Link>
      </div>
    );
  }
  const path = pathForLesson(lesson);
  const ordered = path ? lessonsForPath(path) : [];
  const next = ordered[ordered.findIndex((l) => l.id === lesson.id) + 1];
  return <LessonReader lesson={lesson} userId={user.id} next={next} />;
}
