"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserSettings } from "@/lib/hooks/use-user-settings";

export function RoadmapTrackRedirect({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: settings, isLoading } = useUserSettings(userId);

  useEffect(() => {
    if (!isLoading && settings?.roadmap_id && settings.roadmap_id !== "zte-core-v1" && pathname !== "/learning-path") {
      router.replace("/learning-path");
    }
  }, [isLoading, pathname, router, settings?.roadmap_id]);

  return null;
}
