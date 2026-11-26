"use client";

import { useState } from "react";
import {
  Bell,
  Copy,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { GroupItem, GroupTaskItem, UserProfile } from "@/types/app";
import {
  getAvatarClass,
  getDeadlineBadgeClass,
  getDeadlineMeta,
  getInitials,
} from "@/lib/helpers";

const DEADLINE_PRESETS = [
  { key: "today", label: "Hari ini" },
  { key: "tomorrow", label: "Besok" },
  { key: "3days", label: "3 hari lagi" },
  { key: "5days", label: "5 hari lagi" },
];

const COLUMNS: { key: "todo" | "doing" | "done"; label: string }[] = [
  { key: "todo", label: "Belum" },
  { key: "doing", label: "Dikerjain" },
  { key: "done", label: "Selesai" },
];

interface GroupViewProps {
  currentUser: UserProfile;
  groups: GroupItem[];
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function GroupView({
  currentUser,
  groups,
  selectedGroupId,
  onSelectGroup,
  onRefresh,
  onToast,
}: GroupViewProps) {
  const activeGroup =
    groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  const [focusTab, setFocusTab] = useState<"mine" | "all">("mine");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState(currentUser.id);
  const [newDuePreset, setNewDuePreset] = useState("tomorrow");
  const [submitting, setSubmitting] = useState(false);

  // Selected task detail modal
  const [selectedTask, setSelectedTask] = useState<GroupTaskItem | null>(null);
  const [needsProof, setNeedsProof] = useState(false);
  const [proofInput, setProofInput] = useState("");
  const [proofError, setProofError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Create / Join Group Modal
  const [groupModalMode, setGroupModalMode] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupCourse, setGroupCourse] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groupModalError, setGroupModalError] = useState("");
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupModalError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName, course: groupCourse }),
    });
    const data = (await res.json()) as { group?: GroupItem; error?: string };
    if (!res.ok || !data.group) {
      setGroupModalError(data.error || "Gagal membuat kelompok.");
      return;
    }
    setGroupName("");
    setGroupCourse("");
    setGroupModalMode(null);
    await onRefresh();
    onSelectGroup(data.group.id);
    onToast(`Kelompok dibuat! Kode: #${data.group.inviteCode}`);
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupModalError("");
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode }),
    });
    const data = (await res.json()) as { groupId?: string; error?: string };
    if (!res.ok || !data.groupId) {
      setGroupModalError(data.error || "Kode tidak ditemukan.");
      return;
    }
    setJoinCode("");
    setGroupModalMode(null);
    await onRefresh();
    onSelectGroup(data.groupId);
    onToast("Berhasil bergabung ke kelompok!");
  }

  async function handleToggleLock() {
    if (!activeGroup) return;
    const res = await fetch(`/api/groups/${activeGroup.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLocked: !activeGroup.isLocked }),
    });
    if (res.ok) {
      await onRefresh();
      onToast(
        !activeGroup.isLocked
          ? "Grup dikunci. Orang baru tidak bisa gabung."
          : "Grup dibuka kembali."
      );
    }
  }

  async function handleResetCode() {
    if (!activeGroup) return;
    const res = await fetch(`/api/groups/${activeGroup.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetCode: true }),
    });
    if (res.ok) {
      await onRefresh();
      onToast("Kode undangan baru dibuat.");
    }
  }

  async function handleDeleteGroup() {
    if (!activeGroup) return;
    const res = await fetch(`/api/groups/${activeGroup.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setConfirmDeleteGroup(false);
      await onRefresh();
      onToast("Kelompok berhasil dihapus.");
    } else {
      const data = (await res.json()) as { error?: string };
      onToast(data.error || "Gagal menghapus kelompok.");
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroup || !newTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          assigneeId: newAssigneeId,
          dueDate: newDuePreset,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setShowAddTask(false);
        await onRefresh();
        onToast("Tugas kelompok ditambahkan.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openTaskModal(task: GroupTaskItem, forceProof = false) {
    setSelectedTask(task);
    setProofInput(task.proofText || "");
    setProofError("");
    setNeedsProof(forceProof);
  }

  async function updateTaskStatus(
    task: GroupTaskItem,
    nextStatus: "todo" | "doing" | "done",
    proofText?: string
  ) {
    if (!activeGroup) return;
    if (nextStatus === "done" && task.status !== "done" && !proofText?.trim()) {
      openTaskModal(task, true);
      return;
    }

    const res = await fetch(`/api/groups/${activeGroup.id}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        ...(proofText !== undefined ? { proofText: proofText.trim() } : {}),
      }),
    });

    if (res.ok) {
      await onRefresh();
      if (nextStatus === "done") {
        setSelectedTask(null);
        setNeedsProof(false);
        onToast("Tugas selesai & bukti tersimpan!");
      } else {
        const data = (await res.json()) as { task: GroupTaskItem };
        setSelectedTask(data.task);
        onToast("Status tugas diperbarui.");
      }
    } else {
      const data = (await res.json()) as { error?: string };
      setProofError(data.error || "Gagal memperbarui tugas.");
    }
  }

  async function handleNudge(task: GroupTaskItem) {
    if (!activeGroup) return;
    const res = await fetch(`/api/groups/${activeGroup.id}/tasks/${task.id}/nudge`, {
      method: "POST",
    });
    if (res.ok) {
      onToast(`Pengingat dikirim ke ${task.assignee.name}!`);
    }
  }

  async function handleDeleteTask(task: GroupTaskItem) {
    if (!activeGroup) return;
    const res = await fetch(`/api/groups/${activeGroup.id}/tasks/${task.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSelectedTask(null);
      await onRefresh();
      onToast("Tugas dihapus.");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code);
    onToast(`Kode #${code} disalin!`);
  }

  // Render Group Switcher + Empty State if user has no groups
  const switcherBar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelectGroup(g.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
              activeGroup?.id === g.id
                ? "bg-[var(--primary)] text-white border-transparent"
                : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setGroupModalError("");
            setGroupModalMode("join");
          }}
          className="px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-medium cursor-pointer"
        >
          Gabung Kode
        </button>
        <button
          type="button"
          onClick={() => {
            setGroupModalError("");
            setGroupModalMode("create");
          }}
          className="px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-medium cursor-pointer"
        >
          + Buat Kelompok
        </button>
      </div>
    </div>
  );

  if (!activeGroup) {
    return (
      <div className="space-y-4">
        {switcherBar}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-3">
          <Users className="w-8 h-8 mx-auto text-[var(--muted)]" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Belum ada kelompok tugas</p>
            <p className="text-xs text-[var(--muted)]">
              Buat kelompok baru untuk dapat kode undangan, atau gabung pakai kode dari temanmu.
            </p>
          </div>
        </div>
        {renderGroupModal()}
      </div>
    );
  }

  const totalTasks = activeGroup.tasks.length;
  const doneTasks = activeGroup.tasks.filter((t) => t.status === "done").length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const visibleTasks =
    focusTab === "mine"
      ? activeGroup.tasks.filter((t) => t.assigneeId === currentUser.id)
      : activeGroup.tasks;

  function renderGroupModal() {
    if (!groupModalMode) return null;
    return (
      <div
        onClick={() => setGroupModalMode(null)}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              {groupModalMode === "create"
                ? "Buat Kelompok Baru"
                : "Gabung Pakai Kode"}
            </h3>
            <button
              type="button"
              onClick={() => setGroupModalMode(null)}
              className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {groupModalMode === "create" ? (
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Nama Kelompok / Project
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Misal: Project Basis Data"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Mata Kuliah (opsional)
                </label>
                <input
                  type="text"
                  value={groupCourse}
                  onChange={(e) => setGroupCourse(e.target.value)}
                  placeholder="Sistem Basis Data"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>
              {groupModalError && (
                <p className="text-xs text-red-600 dark:text-red-400">{groupModalError}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer"
              >
                Buat & Generate Kode
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinGroup} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Kode Undangan Kelompok
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: KLP-4B202"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm uppercase outline-none focus:border-[var(--primary)]"
                />
              </div>
              {groupModalError && (
                <p className="text-xs text-red-600 dark:text-red-400">{groupModalError}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer"
              >
                Gabung Sekarang
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {switcherBar}

      {/* Group Overview & Contribution Bar */}
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold">{activeGroup.name}</h2>
            <button
              type="button"
              onClick={() => copyCode(activeGroup.inviteCode)}
              title="Salin kode undangan"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)] font-mono cursor-pointer"
            >
              <span>#{activeGroup.inviteCode}</span>
              <Copy className="w-3 h-3 text-[var(--muted)]" />
            </button>

            {activeGroup.ownerId === currentUser.id && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleLock}
                  title={
                    activeGroup.isLocked
                      ? "Buka kunci grup"
                      : "Kunci grup agar orang baru tidak masuk"
                  }
                  className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  {activeGroup.isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResetCode}
                  title="Ganti kode undangan"
                  className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteGroup(true)}
                  title="Hapus kelompok"
                  className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <span className="text-xs font-semibold text-[var(--muted)]">
            {doneTasks}/{totalTasks} Selesai • {progressPct}%
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Member Contribution Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {activeGroup.members.map((m) => {
            const mDone = activeGroup.tasks.filter(
              (t) => t.assigneeId === m.user.id && t.status === "done"
            ).length;
            const mPct = doneTasks === 0 ? 0 : Math.round((mDone / doneTasks) * 100);
            return (
              <div
                key={m.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg)] border border-[var(--border)] text-xs"
              >
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${getAvatarClass(
                    m.user.avatarColor
                  )}`}
                >
                  {getInitials(m.user.name)}
                </span>
                <span>{m.user.name.split(" ")[0]}</span>
                <span className="font-semibold text-[var(--muted)]">{mPct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Focus Tabs + Single "+ Tugas" Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setFocusTab("mine")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              focusTab === "mine"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Tugas Gue
          </button>
          <button
            type="button"
            onClick={() => setFocusTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              focusTab === "all"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Semua Tugas
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewAssigneeId(currentUser.id);
            setShowAddTask((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tugas</span>
        </button>
      </div>

      {/* 1-Line Quick Add */}
      {showAddTask && (
        <form
          onSubmit={handleCreateTask}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ketik tugas kelompok lalu Enter (misal: Bikin slide Bab 3)..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Tambah
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--muted)] mr-1">Siapa:</span>
              {activeGroup.members.map((m) => (
                <button
                  key={m.user.id}
                  type="button"
                  onClick={() => setNewAssigneeId(m.user.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    newAssigneeId === m.user.id
                      ? "bg-[var(--primary)] text-white border-transparent font-semibold"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {m.user.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--muted)] mr-1">Kapan:</span>
              {DEADLINE_PRESETS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setNewDuePreset(d.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    newDuePreset === d.key
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

      {/* 3-Column Board (3-Info Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedId) return;
                const task = activeGroup.tasks.find((t) => t.id === draggedId);
                setDraggedId(null);
                if (task && task.status !== col.key) {
                  void updateTaskStatus(task, col.key);
                }
              }}
              className="bg-[var(--card)]/70 border border-[var(--border)] rounded-2xl p-3 space-y-3 min-h-[240px]"
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    col.key === "done"
                      ? "text-[#059669] dark:text-emerald-400"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {col.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">
                  {colTasks.length}
                </span>
              </div>

              {colTasks.length === 0 ? (
                <p className="text-xs text-[var(--muted)] text-center py-8">Kosong</p>
              ) : (
                <div className="space-y-2.5">
                  {colTasks.map((task) => {
                    const meta = getDeadlineMeta(task.dueDate, task.status === "done");
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggedId(task.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onClick={() => openTaskModal(task)}
                        className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-3 space-y-2.5 cursor-pointer select-none transition-all hover:-translate-y-0.5 shadow-2xs"
                      >
                        <p className="text-sm font-semibold leading-snug line-clamp-2">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border font-medium ${getDeadlineBadgeClass(
                              meta.level
                            )}`}
                          >
                            {meta.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {task.status === "done" && task.proofText && (
                              <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span
                              title={task.assignee.name}
                              className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${getAvatarClass(
                                task.assignee.avatarColor
                              )}`}
                            >
                              {getInitials(task.assignee.name)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Detail & Proof-of-Work Modal */}
      {selectedTask && (
        <div
          onClick={() => setSelectedTask(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                {(() => {
                  const meta = getDeadlineMeta(
                    selectedTask.dueDate,
                    selectedTask.status === "done"
                  );
                  return (
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-md border font-medium ${getDeadlineBadgeClass(
                        meta.level
                      )}`}
                    >
                      {meta.label}
                    </span>
                  );
                })()}
                <h3 className="text-base font-bold leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--muted)] py-2.5 border-y border-[var(--border)]">
              <div>
                Penanggung Jawab:{" "}
                <span className="font-semibold text-[var(--text)]">
                  {selectedTask.assignee.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleNudge(selectedTask)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 font-medium cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Ingatkan</span>
              </button>
            </div>

            {selectedTask.status === "done" && selectedTask.proofText && (
              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] dark:bg-emerald-500/10 dark:border-emerald-500/30 space-y-1">
                <span className="text-xs font-semibold text-[#059669] dark:text-emerald-300">
                  Bukti Selesai Terlampir
                </span>
                {selectedTask.proofText.startsWith("http") ? (
                  <a
                    href={selectedTask.proofText}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs underline break-all text-[#059669] dark:text-emerald-200"
                  >
                    {selectedTask.proofText}
                  </a>
                ) : (
                  <p className="text-xs break-all text-[#059669] dark:text-emerald-200">
                    {selectedTask.proofText}
                  </p>
                )}
              </div>
            )}

            {needsProof ? (
              <div className="space-y-2.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                <label className="block text-xs font-semibold">
                  Wajib lampirkan bukti (Link Docs/Canva/GitHub atau catatan singkat)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={proofInput}
                  onChange={(e) => {
                    setProofInput(e.target.value);
                    setProofError("");
                  }}
                  placeholder="https://... atau catatan singkat"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs outline-none focus:border-[var(--primary)]"
                />
                {proofError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{proofError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNeedsProof(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!proofInput.trim()) {
                        setProofError("Isi link atau catatan bukti dulu ya.");
                        return;
                      }
                      void updateTaskStatus(selectedTask, "done", proofInput);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Simpan & Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  {COLUMNS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => updateTaskStatus(selectedTask, c.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-colors ${
                        selectedTask.status === c.key
                          ? "bg-[var(--primary)] text-white border-transparent font-semibold"
                          : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDeleteGroup && (
        <div
          onClick={() => setConfirmDeleteGroup(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-bold">Hapus Kelompok?</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Kelompok <strong>{activeGroup.name}</strong> beserta seluruh tugas di dalamnya akan dihapus permanen.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteGroup(false)}
                className="px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--bg)] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {renderGroupModal()}
    </div>
  );
}
