import { useState } from 'react';
import { useTaskStore, type BackgroundTask } from '../../stores/taskStore';

export function TaskManagementPanel() {
  const { tasks, create, start, cancel, remove, clearFinished } = useTaskStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newCwd, setNewCwd] = useState('.');

  const handleCreate = async () => {
    if (!newName.trim() || !newCommand.trim()) return;
    const task = await create(newName.trim(), newCommand.trim(), newCwd.trim());
    setShowCreate(false);
    setNewName('');
    setNewCommand('');
    setNewCwd('.');
    await start(task.id);
  };

  const statusIcon = (s: BackgroundTask['status']) => {
    switch (s) {
      case 'running': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '⛔';
      default: return '⏸️';
    }
  };

  return (
    <div className="flex flex-col h-full text-fg-primary" role="region" aria-label="Task management">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <h3 className="text-sm font-semibold">Tasks</h3>
        <div className="flex gap-1">
          <button onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate} aria-label="Add task" className="text-xs px-2 py-1 rounded bg-accent text-white transition-fast">+ New</button>
          <button onClick={clearFinished} className="text-xs px-2 py-1 rounded border border-border-subtle text-fg-muted hover:bg-surface-hover transition-fast">Clear done</button>
        </div>
      </div>

      {showCreate && (
        <div className="p-3 border-b border-border-default space-y-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Task name" aria-label="Task name" className="w-full px-2 py-1 text-xs bg-surface border border-border-subtle rounded text-fg-primary placeholder:text-fg-muted" />
          <input value={newCommand} onChange={e => setNewCommand(e.target.value)} placeholder="Command (e.g. cargo build)" aria-label="Task command" className="w-full px-2 py-1 text-xs bg-surface border border-border-subtle rounded text-fg-primary placeholder:text-fg-muted" />
          <input value={newCwd} onChange={e => setNewCwd(e.target.value)} placeholder="Working directory" aria-label="Working directory" className="w-full px-2 py-1 text-xs bg-surface border border-border-subtle rounded text-fg-primary placeholder:text-fg-muted" />
          <button onClick={handleCreate} className="w-full py-1 text-xs bg-accent text-white rounded font-medium transition-fast hover:bg-accent-hover">Create & Run</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
            <div className="w-6 h-6 mb-2 opacity-40 flex items-center justify-center text-lg">⚡</div>
            <div className="text-xs">No background tasks</div>
            <div className="text-[10px] text-fg-muted mt-1">Create a task to run commands in the background</div>
          </div>
        )}
        {tasks.map(task => (
          <div key={task.id} className="border-b border-border-default">
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-hover transition-fast"
                onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                aria-expanded={expandedId === task.id}
              >
              <span>{statusIcon(task.status)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{task.name}</div>
                <div className="text-[10px] text-fg-muted truncate">{task.command}</div>
              </div>
              {task.status === 'running' && (
                <div className="w-16 h-1 bg-surface-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${task.progress}%` }} />
                </div>
              )}
              <div className="flex gap-1">
                {task.status === 'pending' && (
                  <button onClick={(e) => { e.stopPropagation(); start(task.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success font-medium transition-fast hover:bg-success/30">Start</button>
                )}
                {task.status === 'running' && (
                  <button onClick={(e) => { e.stopPropagation(); cancel(task.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-error/20 text-error font-medium transition-fast hover:bg-error/30">Cancel</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); remove(task.id); }} aria-label="Remove task" className="text-[10px] px-1.5 py-0.5 rounded border border-border-subtle text-fg-muted hover:bg-surface-hover transition-fast">×</button>
              </div>
            </div>
            {expandedId === task.id && task.output && (
              <div className="px-3 pb-2">
                <pre className="text-[10px] text-fg-muted bg-surface-elevated p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {task.output}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskManagementPanel;
