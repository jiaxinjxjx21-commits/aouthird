import React, { useState } from 'react';
import { Task, ProjectCategory, PriorityLevel } from '../../types';
import { getTodayDateString } from '../../utils/calendarUtils';
import { X, Star, Trash2} from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  projects: ProjectCategory[];
  onClose: () => void;
  onCreateTask: (newTask: Omit<Task, 'id' | 'createdAt'>) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  projects,
  onClose,
  onCreateTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'proj-work');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [isDailyTopPriority, setIsDailyTopPriority] = useState(false);
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('17:00');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  
  // Subtasks list
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSubtasks([
      ...subtasks,
      { id: `st-${Date.now()}`, title: newSubtaskInput.trim(), completed: false },
    ]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim() || undefined,
      projectId,
      priority,
      status: 'todo',
      isDailyTopPriority,
      dueDate,
      dueTime: dueTime || undefined,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      subtasks,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        id="new-task-modal"
        className="bg-[#FDFCF8] border border-[#E8E4D9] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F7F3EB] border-b border-[#E8E4D9] flex items-center justify-between">
          <h3 className="text-lg font-bold font-serif text-[#3D3A35]">
            New Task
          </h3>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#8E8A81]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-3.5 flex-1">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#5C574F] mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
              className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
            />
          </div>

          {/* Daily Top 3 Priority Star Toggle */}
          <div
            onClick={() => setIsDailyTopPriority(!isDailyTopPriority)}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              isDailyTopPriority
                ? 'bg-[#FEF3C7] border-[#FDE68A] ring-1 ring-amber-400/30'
                : 'bg-white border-[#E8E4D9] hover:bg-[#F7F3EB]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isDailyTopPriority ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
                <Star className={`w-3.5 h-3.5 ${isDailyTopPriority ? 'fill-white' : ''}`} />
              </div>
              <p className="text-xs font-semibold text-[#3D3A35]">Top Priority</p>
            </div>

            <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${isDailyTopPriority ? 'bg-amber-500 border-amber-500 text-white' : 'border-[#D4CFC7] bg-white'}`}>
              {isDailyTopPriority && '✓'}
            </div>
          </div>

          {/* Project Category & Priority Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div>
              <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                Category
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">Est. Minutes</label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1.5">
              Subtasks ({subtasks.length})
            </label>
            
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                placeholder="Add a checklist step..."
                className="flex-1 px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-[#8A9A5B] text-white text-xs font-bold rounded-xl"
              >
                Add
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 p-2 bg-[#F7F3EB] rounded-xl border border-[#E8E4D9]">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center justify-between text-xs text-[#3D3A35] bg-white px-2.5 py-1 rounded-lg">
                    <span>{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details or links..."
              className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E4D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8E4D9] text-xs font-bold text-[#5C574F] hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-sm"
            >
              Create Task
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
