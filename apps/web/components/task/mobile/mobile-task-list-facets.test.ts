import { describe, expect, it } from "vitest";
import type { TaskSwitcherItem } from "../task-switcher";
import type { SidebarTaskPageEntry } from "@/lib/types/http";
import { buildMobileFacetGroupedPage, sortMobileFacetPageGroups } from "./mobile-task-list-facets";

const tasks = [
  { id: "multi", title: "Multi" },
  { id: "single", title: "Single" },
  { id: "empty", title: "Empty" },
] as TaskSwitcherItem[];
const entries = tasks.map(({ id }) => ({ kind: "task" as const, task_id: id }));
const values = {
  "facet:plugin:tags:multi": [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
  ],
  "facet:plugin:tags:single": [{ value: "beta", label: "Beta" }],
};

describe("phone List plugin facet presentation", () => {
  it("groups multi-value tasks in every section and keeps unassigned rows", () => {
    const grouped = buildMobileFacetGroupedPage(
      tasks,
      entries as SidebarTaskPageEntry[],
      "facet:plugin:tags",
      { facetValues: values, unassignedLabel: "Unassigned" },
    );

    expect(
      grouped.groups.map((group) => [group.label, group.tasks.map((task) => task.id)]),
    ).toEqual([
      ["Alpha", ["multi"]],
      ["Beta", ["multi", "single"]],
      ["Unassigned", ["empty"]],
    ]);
  });

  it("sorts only the supplied page and retains the unassigned order last", () => {
    const pageOrder = [tasks[1]!, tasks[0]!, tasks[2]!];
    const grouped = {
      groupKey: "none" as const,
      groups: [{ key: "all", label: "", tasks: pageOrder, matchingCount: pageOrder.length }],
      subTasksByParentId: new Map(),
    };
    const sorted = sortMobileFacetPageGroups(grouped, "facet:plugin:tags", values);

    expect(sorted.groups[0]?.tasks.map((task) => task.id)).toEqual(["multi", "single", "empty"]);
  });
});
