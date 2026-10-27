import type { TaskListFacetValue } from "@/lib/plugins/types";
import type { GroupedSidebarList } from "@/lib/sidebar/apply-view";
import { sortItemsByFacet } from "@/lib/tasks/tasks-list-options";
import type { SidebarTaskPageEntry } from "@/lib/types/http";
import type { TaskSwitcherItem } from "../task-switcher";

export type MobileFacetValues = Record<string, readonly TaskListFacetValue[]>;

type FacetSection = {
  key: string;
  label: string;
  tasks: TaskSwitcherItem[];
};

type BuildMobileFacetGroupedPageOptions = {
  facetValues: MobileFacetValues;
  unassignedLabel: string;
  facetSortKey?: string | null;
};

export function buildMobileFacetGroupedPage(
  tasks: TaskSwitcherItem[],
  entries: SidebarTaskPageEntry[],
  facetGroupKey: string,
  { facetValues, unassignedLabel, facetSortKey = null }: BuildMobileFacetGroupedPageOptions,
): GroupedSidebarList {
  const pageTasks = pageTasksInEntryOrder(tasks, entries);
  const sortedTasks = facetSortKey
    ? sortItemsByFacet(pageTasks, facetSortKey, facetValues)
    : pageTasks;
  const sections = new Map<string, FacetSection>();
  const unassigned: TaskSwitcherItem[] = [];

  for (const task of sortedTasks) {
    const values = facetValues[`${facetGroupKey}:${task.id}`] ?? [];
    const namedValues = values.filter((value) => value.value && value.label);
    if (!namedValues.length) {
      unassigned.push(task);
      continue;
    }
    for (const value of namedValues) {
      const key = `facet:value:${value.value}`;
      const section = sections.get(key) ?? { key, label: value.label, tasks: [] };
      section.tasks.push(task);
      sections.set(key, section);
    }
  }

  const ordered = [...sections.values()].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
  );
  if (unassigned.length) {
    ordered.push({
      key: "facet:host:ungrouped",
      label: unassignedLabel,
      tasks: unassigned,
    });
  }
  const subTasksByParentId = new Map<string, TaskSwitcherItem[]>();
  const groups = ordered.map((section) => {
    const ids = new Set(section.tasks.map((task) => task.id));
    const roots: TaskSwitcherItem[] = [];
    for (const task of section.tasks) {
      const parentId = task.parentTaskId;
      if (!parentId || !ids.has(parentId)) {
        roots.push(task);
        continue;
      }
      const children = subTasksByParentId.get(parentId) ?? [];
      if (!children.some((child) => child.id === task.id)) children.push(task);
      subTasksByParentId.set(parentId, children);
    }
    return {
      key: section.key,
      label: section.label,
      tasks: roots,
      matchingCount: section.tasks.length,
    };
  });
  return { groups, subTasksByParentId, groupKey: "none" };
}

export function sortMobileFacetPageGroups(
  grouped: GroupedSidebarList,
  facetSortKey: string,
  facetValues: MobileFacetValues,
): GroupedSidebarList {
  const allTasks = grouped.groups.flatMap((group) => group.tasks);
  for (const children of grouped.subTasksByParentId.values()) allTasks.push(...children);
  const sortedIds = sortItemsByFacet(allTasks, facetSortKey, facetValues).map((task) => task.id);
  const rank = new Map(sortedIds.map((id, index) => [id, index]));
  return {
    ...grouped,
    groups: grouped.groups.map((group) => ({
      ...group,
      tasks: [...group.tasks].sort(
        (left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0),
      ),
    })),
    subTasksByParentId: new Map(
      [...grouped.subTasksByParentId].map(([id, children]) => [
        id,
        [...children].sort((left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0)),
      ]),
    ),
  };
}

function pageTasksInEntryOrder(
  tasks: TaskSwitcherItem[],
  entries: SidebarTaskPageEntry[],
): TaskSwitcherItem[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  const ordered: TaskSwitcherItem[] = [];
  for (const entry of entries) {
    if (entry.kind !== "task" || !entry.task_id || seen.has(entry.task_id)) continue;
    const task = taskById.get(entry.task_id);
    if (!task) continue;
    seen.add(task.id);
    ordered.push(task);
  }
  return ordered;
}
