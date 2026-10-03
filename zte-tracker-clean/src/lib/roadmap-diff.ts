import type { RoadmapSnapshotEntity } from "@/types/database";

export interface DiffChange {
  entityId: string;
  entityType: string;
  before: { title: string; estimatedHours: number | null };
  after: { title: string; estimatedHours: number | null };
}

export interface DiffMove {
  entityId: string;
  entityType: string;
  before: { orderIndex: number; parentId: string | null };
  after: { orderIndex: number; parentId: string | null };
}

export interface RoadmapDiff {
  added: RoadmapSnapshotEntity[];
  removed: RoadmapSnapshotEntity[];
  changed: DiffChange[];
  moved: DiffMove[];
}

/**
 * Same algorithm as scripts/diff_roadmap_snapshots.py, verified against a
 * synthetic before/after snapshot with known mutations (1 add, 1 remove, 2
 * content changes, 1 reorder) before this logic was trusted — there being
 * only one real roadmap.md snapshot today doesn't mean the diff logic
 * itself is unverified, just that there's no second real version yet to
 * exercise it against in production.
 */
export function computeRoadmapDiff(
  entitiesA: RoadmapSnapshotEntity[],
  entitiesB: RoadmapSnapshotEntity[]
): RoadmapDiff {
  const byIdA = new Map(entitiesA.map((e) => [e.entity_id, e]));
  const byIdB = new Map(entitiesB.map((e) => [e.entity_id, e]));

  const added = entitiesB.filter((b) => !byIdA.has(b.entity_id));
  const removed = entitiesA.filter((a) => !byIdB.has(a.entity_id));

  const changed: DiffChange[] = [];
  const moved: DiffMove[] = [];

  for (const [id, a] of byIdA) {
    const b = byIdB.get(id);
    if (!b) continue;
    const contentChanged = a.title !== b.title || a.estimated_hours !== b.estimated_hours;
    const positionChanged = a.order_index !== b.order_index || a.parent_id !== b.parent_id;

    if (contentChanged) {
      changed.push({
        entityId: id,
        entityType: b.entity_type,
        before: { title: a.title, estimatedHours: a.estimated_hours },
        after: { title: b.title, estimatedHours: b.estimated_hours },
      });
    } else if (positionChanged) {
      moved.push({
        entityId: id,
        entityType: b.entity_type,
        before: { orderIndex: a.order_index, parentId: a.parent_id },
        after: { orderIndex: b.order_index, parentId: b.parent_id },
      });
    }
  }

  return {
    added: added.sort((a, b) => a.order_index - b.order_index),
    removed: removed.sort((a, b) => a.order_index - b.order_index),
    changed,
    moved,
  };
}
