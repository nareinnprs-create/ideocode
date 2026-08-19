import { create } from "zustand";

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  triggers: string[];
  enabled: boolean;
  scope: "global" | "project";
  source?: string;
  createdAt: number;
  updatedAt: number;
}

interface SkillState {
  skills: Skill[];
}

interface SkillActions {
  add: (skill: Omit<Skill, "createdAt" | "updatedAt">) => Skill;
  update: (id: string, updates: Partial<Omit<Skill, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  getEnabled: () => Skill[];
  matchTrigger: (input: string) => Skill | null;
  importFromText: (name: string, markdownContent: string) => Skill;
}

export type SkillStore = SkillState & SkillActions;

const STORAGE_KEY = "idc-skills-v2";

function loadState(): SkillState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        skills: (parsed.skills ?? []) as Skill[],
      };
    }
  } catch {}
  return { skills: [] };
}

function saveState(state: SkillState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `skill-${Date.now()}-${idCounter}`;
}

function parseSkillMarkdown(content: string, name: string): { description: string; triggers: string[] } {
  const lines = content.split("\n");
  let description = "";
  const triggers: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("description:")) {
      description = trimmed.slice("description:".length).trim();
    } else if (trimmed.toLowerCase().startsWith("triggers:")) {
      const triggerStr = trimmed.slice("triggers:".length).trim();
      triggers.push(
        ...triggerStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      );
    } else if (trimmed.toLowerCase().startsWith("# ") && !description) {
      const titleContent = trimmed.slice(2).trim();
      if (titleContent !== name) {
        description = titleContent;
      }
    }
  }

  if (!description) {
    const firstParagraph = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"))
      .slice(0, 2)
      .join(" ");
    description = firstParagraph.slice(0, 200);
  }

  return { description, triggers };
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  ...loadState(),

  add: (skill) => {
    const now = Date.now();
    const newSkill: Skill = {
      ...skill,
      createdAt: now,
      updatedAt: now,
    };
    const skills = [...get().skills, newSkill];
    set({ skills });
    saveState({ skills });
    return newSkill;
  },

  update: (id, updates) => {
    const skills = get().skills.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s,
    );
    set({ skills });
    saveState({ skills });
  },

  remove: (id) => {
    const skills = get().skills.filter((s) => s.id !== id);
    set({ skills });
    saveState({ skills });
  },

  toggle: (id) => {
    const skills = get().skills.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s,
    );
    set({ skills });
    saveState({ skills });
  },

  getEnabled: () => get().skills.filter((s) => s.enabled),

  matchTrigger: (input) => {
    const enabled = get().skills.filter((s) => s.enabled);
    const lower = input.toLowerCase();
    for (const skill of enabled) {
      for (const trigger of skill.triggers) {
        const t = trigger.toLowerCase();
        if (lower.includes(t)) return skill;
      }
    }
    return null;
  },

  importFromText: (name, markdownContent) => {
    const { description, triggers } = parseSkillMarkdown(markdownContent, name);
    const now = Date.now();
    const skill: Skill = {
      id: makeId(),
      name,
      description,
      content: markdownContent,
      triggers,
      enabled: true,
      scope: "project",
      createdAt: now,
      updatedAt: now,
    };
    const skills = [...get().skills, skill];
    set({ skills });
    saveState({ skills });
    return skill;
  },
}));
