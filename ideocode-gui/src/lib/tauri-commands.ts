import { invoke } from "@tauri-apps/api/core";
import type { Theme } from "./theme-registry";

export type { Theme } from "./theme-registry";

// ============================================
// Types
// ============================================

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: ToolCall[];
  timestamp?: number;
  usage?: Usage;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  output?: string;
  status?: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  save_label?: string;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  size?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
  conflicted: GitFile[];
}

export interface GitFile {
  path: string;
  status: string;
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
  api_key_env: string;
  is_configured: boolean;
}

export interface Model {
  id: string;
  name: string;
  max_tokens: number;
  supports_vision: boolean;
  supports_tools: boolean;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
}

export interface ProviderStatus {
  active_provider: string;
  active_model: string;
  api_key_configured: boolean;
}

// ============================================
// App Commands
// ============================================

export async function getVersion(): Promise<string> {
  return invoke<string>("get_version");
}

// ============================================
// Chat Commands
// ============================================

export async function sendMessage(
  content: string,
  opts?: { model?: string; mode?: "normal" | "plan" | "agent" },
): Promise<Message> {
  return invoke<Message>("send_message", {
    content,
    model: opts?.model ?? null,
    mode: opts?.mode ?? null,
  });
}

export async function streamChat(
  content: string,
  opts?: { model?: string; mode?: "normal" | "plan" | "agent"; reasoningEffort?: string },
): Promise<Message> {
  return invoke<Message>("stream_chat", {
    content,
    model: opts?.model ?? null,
    mode: opts?.mode ?? null,
    reasoning_effort: opts?.reasoningEffort ?? null,
  });
}

export async function streamInlineEdit(
  filePath: string,
  content: string,
  prompt: string,
): Promise<Message> {
  return invoke<Message>("stream_inline_edit", {
    filePath,
    content,
    prompt,
  });
}

export async function interruptStream(): Promise<boolean> {
  return invoke<boolean>("interrupt_stream");
}

export async function savePartialMessage(
  id: string,
  content: string,
): Promise<Message> {
  return invoke<Message>("save_partial_message", { id, content });
}

export async function compactSession(): Promise<Message[]> {
  return invoke<Message[]>("compact_session");
}

export async function getMessages(): Promise<Message[]> {
  return invoke<Message[]>("get_messages");
}

export async function clearMessages(): Promise<void> {
  return invoke<void>("clear_messages");
}

export async function regenerateLastMessage(): Promise<Message> {
  return invoke<Message>("regenerate_last_message");
}

export async function editLastMessage(content: string): Promise<Message> {
  return invoke<Message>("edit_last_message", { content });
}

export async function loadSession(id: string): Promise<Message[]> {
  return invoke<Message[]>("load_session", { id });
}

export async function renameSession(
  id: string,
  title: string,
): Promise<void> {
  return invoke<void>("rename_session", { id, title });
}

export async function listSessions(): Promise<Session[]> {
  return invoke<Session[]>("list_sessions");
}

export async function deleteSession(id: string): Promise<void> {
  return invoke<void>("delete_session", { id });
}

export async function exportSession(id: string, format: string): Promise<string> {
  return invoke<string>("export_session", { id, format });
}

export async function getInlineCompletion(prefix: string, suffix: string): Promise<string> {
  return invoke<string>("inline_completion", { prefix, suffix });
}

// ============================================
// File Commands
// ============================================

export async function getFileTree(
  path: string,
  depth: number = 3,
): Promise<FileNode[]> {
  return invoke<FileNode[]>("get_file_tree", { path, depth });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function writeFile(
  path: string,
  content: string,
): Promise<void> {
  return invoke<void>("write_file", { path, content });
}

export async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>("file_exists", { path });
}

export async function searchFiles(
  pattern: string,
  path: string,
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search_files", { pattern, path });
}

// ============================================
// Workspace Commands
// ============================================

export async function openWorkspace(): Promise<string> {
  return invoke<string>("open_workspace");
}

export async function saveWorkspacePath(path: string): Promise<void> {
  return invoke<void>("save_workspace_path", { path });
}

export async function loadWorkspacePath(): Promise<string | null> {
  return invoke<string | null>("load_workspace_path");
}

// ============================================
// Git Commands
// ============================================

export async function gitStatus(path: string): Promise<GitStatus> {
  return invoke<GitStatus>("git_status", { path });
}

export async function gitDiff(
  path: string,
  file?: string,
): Promise<string> {
  return invoke<string>("git_diff", { path, file });
}

export async function gitCommit(
  path: string,
  message: string,
): Promise<void> {
  return invoke<void>("git_commit", { path, message });
}

export async function gitAdd(path: string, file: string): Promise<void> {
  return invoke<void>("git_add", { path, file });
}

export async function gitUnstage(path: string, file: string): Promise<void> {
  return invoke<void>("git_unstage", { path, file });
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote: boolean;
}

export async function gitBranches(path: string): Promise<GitBranch[]> {
  return invoke<GitBranch[]>("git_branches", { path });
}

export async function gitCheckout(
  path: string,
  branch: string,
): Promise<void> {
  return invoke<void>("git_checkout", { path, branch });
}

export async function gitStash(path: string): Promise<void> {
  return invoke<void>("git_stash", { path });
}

export async function gitPull(path: string): Promise<void> {
  return invoke<void>("git_pull", { path });
}

export async function gitPush(path: string): Promise<void> {
  return invoke<void>("git_push", { path });
}

// ============================================
// Provider Commands
// ============================================

export interface BuildOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
}

export async function listProviders(): Promise<Provider[]> {
  return invoke<Provider[]>("list_providers");
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  return invoke<ProviderStatus>("get_provider_status");
}

export interface GatewayStatus {
  engine: string;
  online: boolean;
  disabled: boolean;
  installing: boolean;
  port: number;
  base_url: string;
}

export async function getGatewayStatus(): Promise<GatewayStatus> {
  return invoke<GatewayStatus>("gateway_status");
}

export async function runBuild(path: string): Promise<BuildOutput> {
  return invoke<BuildOutput>("run_build", { path });
}

export async function runCargoCheck(path: string): Promise<BuildOutput> {
  return invoke<BuildOutput>("run_cargo_check", { path });
}

export async function runCommand(command: string, cwd: string): Promise<BuildOutput> {
  return invoke<BuildOutput>("run_command", { command, cwd });
}

export async function runNpm(command: string, cwd: string): Promise<BuildOutput> {
  return invoke<BuildOutput>("run_npm", { command, cwd });
}

// ============================================
// Background Task Commands
// ============================================

export interface BackgroundTaskInfo {
  id: string;
  name: string;
  command: string;
  cwd: string;
  status: string;
  progress: number;
  output: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  exit_code: number | null;
}

export async function createTask(name: string, command: string, cwd: string): Promise<BackgroundTaskInfo> {
  return invoke<BackgroundTaskInfo>("create_task", { name, command, cwd });
}

export async function startTask(id: string): Promise<BackgroundTaskInfo> {
  return invoke<BackgroundTaskInfo>("start_task", { id });
}

export async function cancelTask(id: string): Promise<BackgroundTaskInfo> {
  return invoke<BackgroundTaskInfo>("cancel_task", { id });
}

export async function updateTaskProgress(id: string, progress: number): Promise<BackgroundTaskInfo> {
  return invoke<BackgroundTaskInfo>("update_task_progress", { id, progress });
}

export async function listTasks(): Promise<BackgroundTaskInfo[]> {
  return invoke<BackgroundTaskInfo[]>("list_tasks");
}

export async function deleteTask(id: string): Promise<void> {
  return invoke<void>("delete_task", { id });
}

export async function clearFinishedTasks(): Promise<void> {
  return invoke<void>("clear_finished_tasks");
}

// ============================================
// Settings Commands
// ============================================

export interface AppSettings {
  theme: Theme;
  font_size: number;
  font_family: string;
  active_provider: string;
  active_model: string;
  tab_size: number;
  word_wrap: boolean;
  minimap: boolean;
  auto_save: boolean;
  language: string;
  mode: string;
  accent_color: string;
  ui_font_size: number;
  reasoning_effort: string;
  dev_mode: boolean;
  custom_instructions: string;
  api_keys: Record<string, string>;
  mcp_servers: Record<string, string>;
  terminal_shell?: string;
  terminal_font_size?: number;
  terminal_cursor_style?: string;
  privacy_local?: boolean;
  privacy_telemetry?: boolean;
  privacy_mask_files?: boolean;
  workspace_path?: string;
}

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function updateSettings(settings: AppSettings): Promise<void> {
  return invoke<void>("update_settings", { settings });
}

export async function isFirstLaunch(): Promise<boolean> {
  return invoke<boolean>("is_first_launch");
}

// ============================================
// Memory Commands
// ============================================

export interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  category: string;
  created_at: number;
  updated_at: number;
}

export async function listMemories(): Promise<MemoryEntry[]> {
  return invoke<MemoryEntry[]>("list_memories");
}

export async function storeMemory(content: string, tags: string[], category: string): Promise<MemoryEntry> {
  return invoke<MemoryEntry>("store_memory", { content, tags, category });
}

export async function searchMemories(query: string): Promise<MemoryEntry[]> {
  return invoke<MemoryEntry[]>("search_memories", { query });
}

export async function deleteMemory(id: string): Promise<void> {
  return invoke<void>("delete_memory", { id });
}

// ============================================
// RAG / Code Search Commands
// ============================================

export interface CodeSearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
  match_type: string;
}

export interface IndexProgress {
  files_indexed: number;
  total_files: number;
  current_file: string;
}

export async function searchContents(path: string, query: string): Promise<CodeSearchResult[]> {
  return invoke<CodeSearchResult[]>("search_contents", { path, query });
}

export async function searchSemantic(path: string, query: string): Promise<CodeSearchResult[]> {
  return invoke<CodeSearchResult[]>("search_semantic", { path, query });
}

export async function indexDirectory(path: string): Promise<IndexProgress> {
  return invoke<IndexProgress>("index_directory", { path });
}

// ============================================
// Issue Commands
// ============================================

export interface Issue {
  id: string;
  title: string;
  body: string;
  state: string;
  url: string;
  source: string;
  repository: string;
  created_at: number;
  updated_at: number;
  labels: string[];
}

export interface FetchResult {
  fetched: number;
  source: string;
  repository: string;
}

export async function listIssues(source?: string): Promise<Issue[]> {
  return invoke<Issue[]>("list_issues", { source: source || null });
}

export async function searchIssues(query: string): Promise<Issue[]> {
  return invoke<Issue[]>("search_issues", { query });
}

export async function fetchGithubIssues(owner: string, repo: string, token: string): Promise<FetchResult> {
  return invoke<FetchResult>("fetch_github_issues", { owner, repo, token });
}

// ============================================
// Browser Context Commands
// ============================================

export interface BrowserTab {
  url: string;
  title: string;
  last_active: number;
}

export interface BrowserContext {
  active_tab: BrowserTab | null;
  recent_tabs: BrowserTab[];
  updated_at: number;
}

export async function getBrowserContext(): Promise<BrowserContext> {
  return invoke<BrowserContext>("get_browser_context");
}

export async function setBrowserTab(url: string, title: string): Promise<BrowserContext> {
  return invoke<BrowserContext>("set_browser_tab", { url, title });
}

export async function clearBrowserContext(): Promise<void> {
  return invoke<void>("clear_browser_context");
}

export async function getBrowserContextText(): Promise<string> {
  return invoke<string>("get_browser_context_text");
}

// ============================================
// Goal Commands
// ============================================

export interface GoalState {
  goal: string;
  status: string;
  set_at: number;
  updated_at: number;
}

export async function getGoal(): Promise<GoalState> {
  return invoke<GoalState>("get_goal");
}

export async function setGoal(goal: string): Promise<void> {
  return invoke<void>("set_goal", { goal });
}

export async function pauseGoal(): Promise<void> {
  return invoke<void>("pause_goal");
}

export async function resumeGoal(): Promise<void> {
  return invoke<void>("resume_goal");
}

export async function clearGoal(): Promise<void> {
  return invoke<void>("clear_goal");
}

// ============================================
// Wiki Generation
// ============================================

export async function generateWiki(path: string, language?: string): Promise<string> {
  return invoke<string>("generate_wiki", { path, language: language ?? null });
}

// ============================================
// Git Graph
// ============================================

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: number;
  parents: string[];
  branch?: string;
}

export async function gitGraph(path: string, maxCount?: number): Promise<GitCommit[]> {
  return invoke<GitCommit[]>("git_graph", { path, max_count: maxCount ?? 100 });
}

// ============================================
// Remote Development
// ============================================

export async function sshConnect(host: string, port: number, user: string, keyPath?: string): Promise<boolean> {
  return invoke<boolean>("ssh_connect", { config: { host, port, user, key_path: keyPath ?? null } });
}

export async function sshDisconnect(host: string): Promise<void> {
  return invoke<void>("ssh_disconnect", { host });
}

export async function sshExec(host: string, command: string): Promise<string> {
  return invoke<string>("ssh_exec", { host, command });
}

// ============================================
// Browser Automation
// ============================================

export async function browserNavigate(url: string): Promise<void> {
  return invoke<void>("browser_navigate", { url });
}

export async function browserScreenshot(): Promise<string> {
  return invoke<string>("browser_screenshot");
}

export async function browserClick(selector: string): Promise<void> {
  return invoke<void>("browser_click", { selector });
}

export async function browserType(selector: string, text: string): Promise<void> {
  return invoke<void>("browser_type", { selector, text });
}
