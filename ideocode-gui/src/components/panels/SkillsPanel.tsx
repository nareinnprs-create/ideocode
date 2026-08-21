import { useState } from "react";
import { WandSparkles, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useSkillStore } from "../../stores/skillStore";

export function SkillsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const skills = useSkillStore((s) => s.skills);
  const addSkill = useSkillStore((s) => s.add);
  const toggleSkill = useSkillStore((s) => s.toggle);
  const removeSkill = useSkillStore((s) => s.remove);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [triggers, setTriggers] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    addSkill({
      id: `skill-${Date.now()}`,
      name,
      description: desc,
      content: "",
      triggers: triggers.split(",").map((t) => t.trim()).filter(Boolean),
      enabled: true,
      scope: "project",
    });
    setName("");
    setDesc("");
    setTriggers("");
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Skills panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated">
          <WandSparkles size={14} /> Skills
        </button>
        <button onClick={() => setShowAdd(!showAdd)} aria-label="Add skill" aria-expanded={showAdd} className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover transition-fast rounded hover:bg-surface-elevated">
          + Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Skill name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <input type="text" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <input type="text" placeholder="Triggers (comma-separated)" value={triggers} onChange={(e) => setTriggers(e.target.value)}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <button onClick={handleAdd} disabled={!name.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Create Skill</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
            <WandSparkles size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No skills configured</div>
          </div>
        ) : skills.map((s) => (
          <div key={s.id} className="px-3 py-2 border-b border-border-subtle hover:bg-surface-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSkill(s.id)} className="shrink-0">
                {s.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-fg-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-fg-primary">{s.name}</div>
                <div className="text-[11px] text-fg-muted truncate">{s.description}</div>
                {s.triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {s.triggers.map((t) => (
                      <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent">{t}</span>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-fg-muted mt-0.5">{s.scope}</div>
              </div>
              <button onClick={() => removeSkill(s.id)} aria-label="Delete skill" className="p-1 text-fg-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
