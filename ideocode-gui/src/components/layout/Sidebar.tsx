import { useAppStore, type PanelId } from "../../stores/appStore";
import { useGoalStore } from "../../stores/goalStore";
import {
  MessageCirclePlus,
  FolderOpen,
  Target,
  Circle,
  CheckCircle2,
  ChevronRight,
  Trash2,
  ListTodo,
  BookOpen,
  Brain,
  Zap,
  Users,
  Terminal,
  Link2,
  Plug,
  Puzzle,
  WandSparkles,
  Radio,
  Monitor,
  Cast,
  Keyboard,
  Shield,
  Timer,
  BarChart3,
  GitBranch,
  Settings,
  Layers,
  FileCode2,
  LayoutTemplate,
  Palette,
} from "lucide-react";
import { useState } from "react";

type NavItem = { id: string; label: string; icon: typeof Target; panel: PanelId; };

const NAV_ITEMS: NavItem[] = [
  { id: "task-management", label: "Tasks", icon: Layers, panel: "task-management" },
  { id: "wiki", label: "Wiki", icon: BookOpen, panel: "wiki" },
  { id: "memory", label: "Memory", icon: Brain, panel: "memory" },
  { id: "snippets", label: "Snippets", icon: FileCode2, panel: "snippets" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, panel: "templates" },
  { id: "themes", label: "Themes", icon: Palette, panel: "themes" },
  { id: "automations", label: "Automations", icon: Zap, panel: "automations" },
  { id: "subagents", label: "Subagents", icon: Users, panel: "subagents" },
  { id: "commands", label: "Commands", icon: Terminal, panel: "commands" },
  { id: "hooks", label: "Hooks", icon: Link2, panel: "hooks" },
  { id: "mcp", label: "MCP", icon: Plug, panel: "mcp" },
  { id: "plugins", label: "Plugins", icon: Puzzle, panel: "plugins" },
  { id: "skills", label: "Skills", icon: WandSparkles, panel: "skills" },
  { id: "browser", label: "Browser", icon: Monitor, panel: "browser" },
  { id: "bot-channel", label: "Bot Channel", icon: Radio, panel: "bot-channel" },
  { id: "remote-dev", label: "Remote Dev", icon: Monitor, panel: "remote-dev" },
  { id: "remote-control", label: "Remote Control", icon: Cast, panel: "remote-control" },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, panel: "shortcuts" },
  { id: "safety", label: "Safety", icon: Shield, panel: "safety" },
  { id: "idle-tasks", label: "Idle Tasks", icon: Timer, panel: "idle-tasks" },
  { id: "usage-stats", label: "Usage Stats", icon: BarChart3, panel: "usage-stats" },
];

export function Sidebar() {
  const [tasksOpen, setTasksOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const { setChatPanelOpen, setRightPanel, setRightPanelOpen, rightPanelOpen } = useAppStore();
  const activePanel = useAppStore((s) => s.rightPanel);
  const { goal, status, tasks, selectTask, selectedTaskId, removeTask, toggleTaskDone } = useGoalStore();

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const activeTask = tasks.find((t) => t.status === "in_progress");

  const handleNewTask = () => {
    setChatPanelOpen(true);
  };

  const handleOpenWorkspace = () => {
    if (!rightPanelOpen) setRightPanelOpen(true);
    setRightPanel("files");
  };

  return (
    <section className="relative flex-col shrink-0 overflow-hidden transition-[width,opacity,transform] duration-300 ease-out hidden md:block bg-transparent w-56 md:w-60 lg:w-64 opacity-100 border-r border-window-border z-20">
      <div className="flex h-full min-h-0 flex-col w-56 md:w-60 lg:w-64 transition-transform duration-300 ease-out translate-x-0">
        <div data-tauri-drag-region className="h-12 shrink-0 cursor-move" />

        <div className="flex flex-col gap-1 px-2 py-3">
          <button
            onClick={handleNewTask}
            className="group/button inline-flex h-8 w-full shrink-0 items-center justify-start gap-2 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-foreground outline-none transition-all hover:bg-surface-hover hover:text-foreground"
          >
            <MessageCirclePlus className="size-4 shrink-0" />
            <span className="truncate">New Task</span>
            <span className="ml-auto shrink-0 text-[11px] font-normal text-foreground-subtlest">⌘N</span>
          </button>

          <button
            onClick={handleOpenWorkspace}
            className="group/button inline-flex h-8 w-full shrink-0 items-center justify-start gap-2 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-foreground outline-none transition-all hover:bg-surface-hover hover:text-foreground"
          >
            <FolderOpen className="size-4 shrink-0" />
            <span>Open Workspace</span>
          </button>
        </div>

        {goal && (
          <div className="mx-2 mb-2 p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle cursor-pointer hover:border-accent-primary/30 transition-fast" onClick={() => { if (!rightPanelOpen) setRightPanelOpen(true); setRightPanel("goal"); }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={12} className="text-accent-primary shrink-0" />
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Goal</span>
              {status !== "idle" && (
                <span
                  className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                    status === "in_progress"
                      ? "bg-success/10 text-success"
                      : status === "paused"
                        ? "bg-warning/10 text-warning"
                        : "bg-accent-primary/10 text-accent-primary"
                  }`}
                >
                  {status === "in_progress" ? "Active" : status === "paused" ? "Paused" : "Done"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-primary leading-snug line-clamp-2">{goal}</p>
          </div>
        )}

        <div className="px-2 pb-1">
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider w-full"
          >
            <ChevronRight size={11} className={`transition-transform ${toolsOpen ? "rotate-90" : ""}`} />
            Tools
          </button>
          {toolsOpen && (
            <div className="mt-1 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!rightPanelOpen) setRightPanelOpen(true);
                    setRightPanel(item.panel);
                  }}
                  className={`relative flex items-center gap-2 w-full px-2 py-1 rounded-md text-[12px] transition-colors ${activePanel === item.panel ? "bg-bg-elevated text-accent-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"}`}
                >
                  {activePanel === item.panel && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r bg-accent-primary" />}
                  <item.icon size={13} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  if (!rightPanelOpen) setRightPanelOpen(true);
                  setRightPanel("git");
                }}
                className={`relative flex items-center gap-2 w-full px-2 py-1 rounded-md text-[12px] transition-colors ${activePanel === "git" ? "bg-bg-elevated text-accent-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"}`}
              >
                {activePanel === "git" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r bg-accent-primary" />}
                <GitBranch size={13} className="shrink-0" />
                <span className="truncate">Git</span>
              </button>
              <button
                onClick={() => {
                  if (!rightPanelOpen) setRightPanelOpen(true);
                  setRightPanel("settings");
                }}
                className={`relative flex items-center gap-2 w-full px-2 py-1 rounded-md text-[12px] transition-colors ${activePanel === "settings" ? "bg-bg-elevated text-accent-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"}`}
              >
                {activePanel === "settings" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r bg-accent-primary" />}
                <Settings size={13} className="shrink-0" />
                <span className="truncate">Settings</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
          <div className="flex items-center justify-between gap-2 pl-[18px] pr-3">
            <h3 className="min-w-0 text-[13px] font-semibold text-foreground-subtlest">Tasks</h3>
            <span className="text-[10px] text-text-muted font-mono">{pendingTasks.length}</span>
          </div>

          <div className="relative flex min-h-0 flex-1">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-thin">
              <div className="flex min-h-0 flex-col gap-3 px-2">
                {activeTask && (
                  <div className="p-2 rounded-lg bg-accent-primary/5 border border-accent-primary/15">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="flex size-4 items-center justify-center">
                        <span className="block size-1.5 rounded-full bg-accent-primary animate-pulse" />
                      </span>
                      <span className="text-[10px] font-semibold text-accent-primary uppercase tracking-wider">In Progress</span>
                    </div>
                    <p className="text-[11px] text-text-primary leading-snug line-clamp-2 pl-5.5">{activeTask.title}</p>
                  </div>
                )}

                <ul className="space-y-0.5">
                  {pendingTasks
                    .filter((t) => t.status !== "in_progress")
                    .map((task) => (
                      <li
                        key={task.id}
                        onClick={() => selectTask(task.id === selectedTaskId ? null : task.id)}
                        className={`group/task-item flex items-center gap-2 rounded-lg py-1 pl-2.5 pr-1 transition-all cursor-pointer ${
                          task.id === selectedTaskId
                            ? "bg-selected text-foreground shadow-sm"
                            : "hover:bg-surface-hover text-foreground-subtle hover:text-foreground"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskDone(task.id);
                          }}
                          className="shrink-0 text-text-muted hover:text-success transition-colors"
                        >
                          <Circle size={13} />
                        </button>
                        <p className="min-w-0 flex-1 truncate text-[13px]">{task.title}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTask(task.id);
                          }}
                          className="shrink-0 opacity-0 group-hover/task-item:opacity-100 text-text-muted hover:text-error transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </li>
                    ))}
                </ul>

                {doneTasks.length > 0 && (
                  <div>
                    <button
                      onClick={() => setTasksOpen(!tasksOpen)}
                      className="flex items-center gap-1.5 text-[10px] font-medium text-text-muted hover:text-text-secondary transition-colors"
                    >
                      <ChevronRight size={11} className={`transition-transform ${tasksOpen ? "rotate-90" : ""}`} />
                      Completed ({doneTasks.length})
                    </button>
                    {tasksOpen && (
                      <ul className="mt-1 space-y-0.5">
                        {doneTasks.map((task) => (
                          <li
                            key={task.id}
                            className="flex items-center gap-2 py-1 pl-6 pr-1 text-foreground-subtle/60"
                          >
                            <CheckCircle2 size={13} className="text-success/60 shrink-0" />
                            <p className="min-w-0 flex-1 truncate text-[13px] line-through">{task.title}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {tasks.length === 0 && (
                  <div className="py-8 text-center">
                    <ListTodo size={24} className="mx-auto mb-2 text-text-muted/40" />
                    <p className="text-[11px] text-text-muted">No tasks yet</p>
                    <p className="text-[10px] text-text-muted/60 mt-0.5">Set a goal or add tasks manually</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
