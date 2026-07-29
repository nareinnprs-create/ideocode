import { invoke } from "@tauri-apps/api/core";

// ============================================
// Types
// ============================================

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: ToolCall[];
  timestamp?: number;
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
// Chat Commands
// ============================================

export async function sendMessage(content: string): Promise<Message> {
  return invoke<Message>("send_message", { content });
}

export async function getMessages(): Promise<Message[]> {
  return invoke<Message[]>("get_messages");
}

export async function clearMessages(): Promise<void> {
  return invoke<void>("clear_messages");
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

export async function runBuild(path: string): Promise<BuildOutput> {
  return invoke<BuildOutput>("run_build", { path });
}

export async function runCargoCheck(path: string): Promise<BuildOutput> {
  return invoke<BuildOutput>("run_cargo_check", { path });
}

// ============================================
// Settings Commands
// ============================================

export interface AppSettings {
  theme: string;
  font_size: number;
  font_family: string;
  active_provider: string;
  active_model: string;
  tab_size: number;
  word_wrap: boolean;
  minimap: boolean;
  auto_save: boolean;
  language: string;
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
