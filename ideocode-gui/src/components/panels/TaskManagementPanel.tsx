import { useState } from "react";
import {
  Layers,
  LayoutGrid,
  Clock,
  Search,
  Plus,
  Circle,
  CheckCircle2,
  GripVertical,
  Archive,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTaskStore, type TaskItem, type TaskItemStatus, type ViewMode } from "../../stores/taskStore";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

const VIEW_MODES: { id: ViewMode; label: string; icon: typeof Layers }[] = [
  { id: "grouped", label: "Grouped", icon: Layers },
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "timeline", label: "Timeline", icon: Clock },
];

const STATUS_ICON: Record<TaskItemStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const STATUS_COLOR: Record<TaskItemStatus, string> = {
  todo: "text-text-muted",
  in_progress: "text-accent-primary",
  done: "text-success",
};

const PRIORITY_TONE: Record<string, "default" | "accent" | "success" | "warning" | "error" | "info"> = {
  low: "info",
  medium: "warning",
  high: "error",
};

function TaskCard({ task }: { task: TaskItem }) {
  const { updateTask, removeTask, expandedTaskId, setExpandedTaskId } = useTaskStore();
  const isExpanded = expandedTaskId === task.id;
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description);

  const StatusIcon = STATUS_ICON[task.status];

  const cycleStatus = () => {
    const order: TaskItemStatus[] = ["todo", "in_progress", "done"];
    const idx = order.indexOf(task.status);
    updateTask(task.id, { status: order[(idx + 1) % order.length] });
  };

  return (
    <div className="group rounded-lg border border-border-subtle bg-bg-secondary/60 hover:border-border-default transition-fast">
      <div
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer"
        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
      >
        <GripVertical size={12} className="text-text-muted/40 shrink-0 cursor-grab" />
        <button
          onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
          className={`shrink-0 ${STATUS_COLOR[task.status]}`}
        >
          <StatusIcon size={14} />
        </button>
        <span className="flex-1 text-xs text-text-primary truncate">{task.title}</span>
        <Badge tone={PRIORITY_TONE[task.priority]} className="shrink-0">
          {task.priority}
        </Badge>
        <button
          onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0 border-t border-border-subtle mt-0 space-y-2">
          {editingDesc ? (
            <div className="space-y-1 pt-2">
              <textarea
                autoFocus
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-border-subtle bg-bg-tertiary text-text-primary outline-none resize-none min-h-[48px] focus:border-accent-primary"
                rows={3}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => { updateTask(task.id, { description: descDraft }); setEditingDesc(false); }}
                >
                  Save
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => { setDescDraft(task.description); setEditingDesc(false); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <div className="text-[11px] text-text-muted mb-1">Description</div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {task.description || <span className="text-text-muted italic">No description</span>}
              </p>
              <button
                onClick={() => { setDescDraft(task.description); setEditingDesc(true); }}
                className="mt-1.5 flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-fast"
              >
                <Pencil size={10} />
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddTaskInline({ onDone }: { onDone: () => void }) {
  const { addTask, groups } = useTaskStore();
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({
      title: trimmed,
      description: "",
      status: "todo",
      priority: "medium",
      group: groups[0]?.id ?? "",
    });
    setTitle("");
    onDone();
  };

  return (
    <div className="flex items-center gap-1.5 px-1">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") onDone();
        }}
        placeholder="Task title..."
        className="flex-1 px-2 py-1.5 text-xs rounded border border-border-subtle bg-bg-tertiary text-text-primary focus:outline-none focus:border-accent-primary"
      />
      <Button size="xs" variant="primary" onClick={handleAdd} disabled={!title.trim()}>
        Add
      </Button>
    </div>
  );
}

function AddGroupInline({ onDone }: { onDone: () => void }) {
  const { addGroup } = useTaskStore();
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addGroup({ name: trimmed, color: "#6366F1" });
    setName("");
    onDone();
  };

  return (
    <div className="flex items-center gap-1.5 px-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") onDone();
        }}
        placeholder="Group name..."
        className="flex-1 px-2 py-1.5 text-xs rounded border border-border-subtle bg-bg-tertiary text-text-primary focus:outline-none focus:border-accent-primary"
      />
      <Button size="xs" variant="primary" onClick={handleAdd} disabled={!name.trim()}>
        Add
      </Button>
    </div>
  );
}

function GroupedView() {
  const { tasks, groups, showArchived } = useTaskStore();
  const [addingTask, setAddingTask] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = tasks.filter((t) => showArchived || !t.archived);
  const ungrouped = filtered.filter((t) => !t.group || !groups.find((g) => g.id === t.group));

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const groupTasks = filtered.filter((t) => t.group === group.id);
        const collapsed = collapsedGroups.has(group.id);
        return (
          <div key={group.id} className="space-y-1">
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-2 w-full px-1 py-1 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded transition-fast"
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
              <span className="flex-1 text-left">{group.name}</span>
              <span className="text-[10px] text-text-muted">{groupTasks.length}</span>
            </button>
            {!collapsed && (
              <div className="space-y-1 pl-4">
                {groupTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className="space-y-1">
          <div className="px-1 py-1 text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Ungrouped
          </div>
          {ungrouped.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {addingTask ? (
        <AddTaskInline onDone={() => setAddingTask(false)} />
      ) : addingGroup ? (
        <AddGroupInline onDone={() => setAddingGroup(false)} />
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <Plus size={11} />
            Add task
          </button>
          <button
            onClick={() => setAddingGroup(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <Plus size={11} />
            Add group
          </button>
        </div>
      )}
    </div>
  );
}

function WorkspaceView() {
  const { tasks, showArchived, sortField } = useTaskStore();
  const [addingTask, setAddingTask] = useState(false);

  const filtered = tasks
    .filter((t) => showArchived || !t.archived)
    .sort((a, b) => {
      const field = sortField === "created" ? "createdAt" : "updatedAt";
      return b[field] - a[field];
    });

  return (
    <div className="space-y-1.5">
      {filtered.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
      {addingTask ? (
        <AddTaskInline onDone={() => setAddingTask(false)} />
      ) : (
        <button
          onClick={() => setAddingTask(true)}
          className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
        >
          <Plus size={11} />
          Add task
        </button>
      )}
    </div>
  );
}

function TimelineView() {
  const { tasks, showArchived } = useTaskStore();

  const filtered = tasks
    .filter((t) => showArchived || !t.archived)
    .sort((a, b) => b.createdAt - a.createdAt);

  const groupedByDate: Record<string, TaskItem[]> = {};
  for (const task of filtered) {
    const date = new Date(task.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(task);
  }

  const dates = Object.keys(groupedByDate);

  return (
    <div className="space-y-3">
      {dates.map((date) => (
        <div key={date} className="space-y-1">
          <div className="px-1 py-1 text-[10px] uppercase tracking-wider text-text-muted font-medium flex items-center gap-2">
            <Clock size={10} />
            {date}
          </div>
          {groupedByDate[date].map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TaskManagementPanel() {
  const {
    tasks,
    searchQuery,
    sortField,
    viewMode,
    showArchived,
    setSearchQuery,
    setSortField,
    setViewMode,
    setShowArchived,
  } = useTaskStore();

  const [addingTask, setAddingTask] = useState(false);

  const filtered = tasks.filter((t) => {
    if (!showArchived && t.archived) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-subtle space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">Tasks</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`p-1 rounded transition-fast ${
                showArchived ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary"
              }`}
              title="Toggle archived"
            >
              <Archive size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1" role="tablist" aria-label="View mode">
          {VIEW_MODES.map(({ id, label, icon: ViewIcon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              aria-pressed={viewMode === id}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-fast ${
                viewMode === id
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <ViewIcon size={11} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-7 pr-2 py-1 text-xs rounded border border-border-subtle bg-bg-tertiary text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary"
            />
          </div>
          <button
            onClick={() => setSortField(sortField === "created" ? "updated" : "created")}
            className="px-2 py-1 text-[10px] text-text-muted hover:text-text-primary rounded border border-border-subtle hover:border-border-default transition-fast"
            title={`Sort by ${sortField === "created" ? "updated" : "created"}`}
          >
            {sortField === "created" ? "Created" : "Updated"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3">
        {filtered.length === 0 && !addingTask ? (
          <EmptyState
            icon={<Layers size={20} />}
            title="No tasks"
            description="Create a task to get started"
            action={
              <Button size="xs" variant="primary" onClick={() => setAddingTask(true)} leadingIcon={<Plus size={12} />}>
                Add Task
              </Button>
            }
          />
        ) : (
          <>
            {viewMode === "grouped" && <GroupedView />}
            {viewMode === "workspace" && <WorkspaceView />}
            {viewMode === "timeline" && <TimelineView />}
          </>
        )}
      </div>
    </div>
  );
}
