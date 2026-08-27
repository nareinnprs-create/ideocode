import { useAppStore, type PanelId } from "../../stores/appStore";
import { useGoalStore } from "../../stores/goalStore";
import { Tooltip } from "../ui/Tooltip";
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
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";

type NavItem = { id: string; label: string; icon: typeof Target; panel: PanelId; };

const NAV_ITEMS: NavItem[] = [
  { id: "task-management", label: "Tasks", icon: Layers, panel: "task-management" },
  { id: "wiki", label: "Wiki", icon: BookOpen, panel: "wiki" },
  { id: "memory", label: "Memory", icon: Brain, panel: "memory" },
  { id: "context", label: "Context", icon: FileCode2, panel: "context" },
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
  const [collapsed, setCollapsed] = useState(false);
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

  const navBtnClass = (panel: PanelId) =>
    `relative flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[12px] transition-all duration-150 ${
      activePanel === panel
        ? "bg-accent-subtle text-accent font-medium shadow-glow-soft"
        : "text-fg-secondary hover:text-fg-primary hover:bg-surface-hover"
    }`;

  const collapsedBtnClass = (panel: PanelId) =>
    `flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
      activePanel === panel
        ? "bg-accent-subtle text-accent"
        : "text-fg-secondary hover:text-fg-primary hover:bg-surface-hover"
    }`;

  const activeIndicator = (panel: PanelId) =>
    activePanel === panel ? <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-accent" /> : null;

  return (
    <nav
      aria-label="Main navigation"
      className="relative flex-col shrink-0 overflow-hidden transition-all duration-300 ease-spring hidden md:block surface-blur hairline-right z-20"
      style={{
        width: collapsed ? 48 : undefined,
        background: "color-mix(in srgb, var(--color-surface) 50%, transparent)",
      }}
    >
      <div className="flex h-full min-h-0 flex-col w-56 md:w-60 lg:w-64 transition-all duration-300 ease-spring">
        {/* Drag region + collapse toggle */}
        <div className="flex items-center h-12 shrink-0">
          <div data-tauri-drag-region className="flex-1 h-full cursor-move" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-8 h-8 mr-1 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-hover transition-all"
            title={collapsed ? "Expand positionbar" : "Collapse positionbar"}
            aria-label={collapsed ? "Expand positionbar" : "Collapse positionbar"}
          >
            {collapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {collapsed ? (
          /* ── Collapsed: icon-only nav ── */
          <div className="flex flex-col items-center gap-1 px-1 py-2 overflow-y-auto scroll-thin">
            <Tooltip label="New Task" position="right">
              <button
                onClick={handleNewTask}
                aria-label="New Task"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-hover transition-all"
              >
                <MessageCirclePlus size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Open Workspace" position="right">
              <button
                onClick={handleOpenWorkspace}
                aria-label="Open Workspace"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-hover transition-all"
              >
                <FolderOpen size={16} />
              </button>
            </Tooltip>
            <div className="w-5 h-px bg-border-subtle my-1" />
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.id} label={item.label} position="right">
                <button
                  onClick={() => {
                    if (!rightPanelOpen) setRightPanelOpen(true);
                    setRightPanel(item.panel);
                  }}
                  aria-label={item.label}
                  className={collapsedBtnClass(item.panel)}
                >
                  <item.icon size={16} />
                </button>
              </Tooltip>
            ))}
            <div className="w-5 h-px bg-border-subtle my-1" />
            <Tooltip label="Git" position="right">
              <button
                onClick={() => {
                  if (!rightPanelOpen) setRightPanelOpen(true);
                  setRightPanel("git");
                }}
                aria-label="Git"
                className={collapsedBtnClass("git")}
              >
                <GitBranch size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Settings" position="right">
              <button
                onClick={() => {
                  if (!rightPanelOpen) setRightPanelOpen(true);
                  setRightPanel("settings");
                }}
                aria-label="Settings"
                className={collapsedBtnClass("settings")}
              >
                <Settings size={16} />
              </button>
            </Tooltip>
          </div>
        ) : (
          /* ── Expanded: full positionbar ── */
          <>
            <div className="flex flex-col gap-1 px-2 py-3">
              <button
                onClick={handleNewTask}
                className="group/button inline-flex h-8 w-full shrink-0 items-center justify-start gap-2 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-fg-primary outline-none transition-all hover:bg-surface-hover hover:text-fg-primary"
              >
                <MessageCirclePlus className="size-4 shrink-0" />
                <span className="truncate">New Task</span>
                <span className="ml-auto shrink-0 text-[11px] font-normal text-fg-muted">⌘N</span>
              </button>

              <button
                onClick={handleOpenWorkspace}
                className="group/button inline-flex h-8 w-full shrink-0 items-center justify-start gap-2 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-fg-primary outline-none transition-all hover:bg-surface-hover hover:text-fg-primary"
              >
                <FolderOpen className="size-4 shrink-0" />
                <span>Open Workspace</span>
              </button>
            </div>

            {goal && (
              <div className="mx-2 mb-2 p-2.5 rounded-lg bg-surface-elevated border border-border-subtle cursor-pointer hover:border-accent/30 transition-fast" onClick={() => { if (!rightPanelOpen) setRightPanelOpen(true); setRightPanel("goal"); }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target size={12} className="text-accent shrink-0" />
                  <span className="text-[10px] font-semibold text-fg-secondary uppercase tracking-wider">Goal</span>
                  {status !== "idle" && (
                    <span
                      className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                        status === "in_progress"
                          ? "bg-success-muted text-success"
                          : status === "paused"
                            ? "bg-warning-muted text-warning"
                            : "bg-accent-subtle text-accent"
                      }`}
                    >
                      {status === "in_progress" ? "Active" : status === "paused" ? "Paused" : "Done"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-fg-primary leading-snug line-clamp-2">{goal}</p>
              </div>
            )}

            <div className="px-2 pb-1">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                aria-expanded={toolsOpen}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-fg-muted uppercase tracking-wider w-full"
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
                      className={navBtnClass(item.panel)}
                    >
                      {activeIndicator(item.panel)}
                      <item.icon size={13} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (!rightPanelOpen) setRightPanelOpen(true);
                      setRightPanel("git");
                    }}
                    className={navBtnClass("git")}
                  >
                    {activeIndicator("git")}
                    <GitBranch size={13} className="shrink-0" />
                    <span className="truncate">Git</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!rightPanelOpen) setRightPanelOpen(true);
                      setRightPanel("settings");
                    }}
                    className={navBtnClass("settings")}
                  >
                    {activeIndicator("settings")}
                    <Settings size={13} className="shrink-0" />
                    <span className="truncate">Settings</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
              <div className="flex items-center justify-between gap-2 pl-[18px] pr-3">
                <h3 className="min-w-0 text-[13px] font-semibold text-fg-muted">Tasks</h3>
                <span
                  className="text-[10px] text-fg-muted font-mono"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {pendingTasks.length}
                </span>
              </div>

              <div className="relative flex min-h-0 flex-1">
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-thin">
                  <div className="flex min-h-0 flex-col gap-3 px-2">
                    {activeTask && (
                      <div className="p-2 rounded-lg bg-accent-subtle border border-accent/15">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="flex size-4 items-center justify-center">
                            <span className="block size-1.5 rounded-full bg-accent animate-pulse" />
                          </span>
                          <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">In Progress</span>
                        </div>
                        <p className="text-[11px] text-fg-primary leading-snug line-clamp-2 pl-5.5">{activeTask.title}</p>
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
                                ? "bg-accent-subtle text-fg-primary shadow-glow-soft"
                                : "hover:bg-surface-hover text-fg-secondary hover:text-fg-primary"
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskDone(task.id);
                              }}
                              aria-label="Mark task done"
                              className="shrink-0 text-fg-muted hover:text-success transition-colors"
                            >
                              <Circle size={13} />
                            </button>
                            <p className="min-w-0 flex-1 truncate text-[13px]">{task.title}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTask(task.id);
                              }}
                              aria-label="Delete task"
                              className="shrink-0 opacity-0 group-hover/task-item:opacity-100 text-fg-muted hover:text-error transition-all"
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
                          aria-expanded={tasksOpen}
                          className="flex items-center gap-1.5 text-[10px] font-medium text-fg-muted hover:text-fg-secondary transition-colors"
                        >
                          <ChevronRight size={11} className={`transition-transform ${tasksOpen ? "rotate-90" : ""}`} />
                          Completed ({doneTasks.length})
                        </button>
                        {tasksOpen && (
                          <ul className="mt-1 space-y-0.5">
                            {doneTasks.map((task) => (
                              <li
                                key={task.id}
                                className="flex items-center gap-2 py-1 pl-6 pr-1 text-fg-muted"
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
                        <ListTodo size={24} className="mx-auto mb-2 text-fg-muted/40" />
                        <p className="text-[11px] text-fg-muted">No tasks yet</p>
                        <p className="text-[10px] text-fg-muted mt-0.5">Set a goal or add tasks manually</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
