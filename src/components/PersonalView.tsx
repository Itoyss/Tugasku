"use client";

import { useState } from "react";
import { Bell, BellOff, Check, Plus, Trash2 } from "lucide-react";
import { PersonalTaskItem } from "@/types/app";
import { getDeadlineBadgeClass, getDeadlineMeta } from "@/lib/helpers";

const COURSE_PRESETS = ["Basis Data", "Pemrograman Web", "Jaringan", "Umum"];
const DEADLINE_PRESETS = [
  { key: "today", label: "Hari ini" },
  { key: "tomorrow", label: "Besok" },
  { key: "3days", label: "3 hari lagi" },
  { key: "5days", label: "5 hari lagi" },
];

interface PersonalViewProps {
  tasks: PersonalTaskItem[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function PersonalView({ tasks, onRefresh, onToast }: PersonalViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("Basis Data");
  const [duePreset, setDuePreset] = useState("tomorrow");
  const [submitting, setSubmitting] = useState(false);

  const activeCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - activeCount;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/personal-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), course, dueDate: duePreset }),
      });
      if (res.ok) {
        setTitle("");
        setShowAdd(false);
        await onRefresh();
        onToast("Tugas mandiri ditambahkan.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleDone(task: PersonalTaskItem) {
    const res = await fetch(`/api/personal-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    if (res.ok) {
      await onRefresh();
      onToast(!task.done ? "Tugas mandiri selesai!" : "Tugas dibuka kembali.");
    }
  }

  async function toggleRemind(task: PersonalTaskItem) {
    const res = await fetch(`/api/personal-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindEnabled: !task.remindEnabled }),
    });
    if (res.ok) {
      await onRefresh();
      onToast(!task.remindEnabled ? "Reminder diaktifkan." : "Reminder dimatikan.");
    }
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/personal-tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      await onRefresh();
      onToast("Tugas dihapus.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold">Reminder Tugas Mandiri</h2>
          <p className="text-xs text-[var(--muted)]">
            {activeCount} belum selesai • {doneCount} selesai
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tugas</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ketik tugas pribadi lalu Enter (misal: Resume Jurnal)..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Simpan
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--muted)] mr-1">Matkul:</span>
              {COURSE_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCourse(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    course === c
                      ? "bg-[var(--primary)] text-white border-transparent font-semibold"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--muted)] mr-1">Deadline:</span>
              {DEADLINE_PRESETS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDuePreset(d.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    duePreset === d.key
                      ? "bg-[var(--primary)] text-white border-transparent font-semibold"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center text-xs text-[var(--muted)]">
          Belum ada tugas mandiri. Klik <strong>+ Tugas</strong> untuk tambah pengingat baru.
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const meta = getDeadlineMeta(task.dueDate, task.done);
            return (
              <div
                key={task.id}
                className={`group bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-opacity ${
                  task.done ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleDone(task)}
                    aria-label="Tandai selesai"
                    className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                      task.done
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-[var(--border)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {task.done && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        task.done ? "line-through" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{task.course}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-lg border font-medium ${getDeadlineBadgeClass(
                      meta.level
                    )}`}
                  >
                    {meta.label}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleRemind(task)}
                    title={task.remindEnabled ? "Reminder aktif" : "Reminder mati"}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      task.remindEnabled && !task.done
                        ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {task.remindEnabled && !task.done ? (
                      <Bell className="w-3.5 h-3.5" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    title="Hapus tugas"
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
