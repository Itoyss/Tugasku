"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import {
  GroupItem,
  NotificationItem,
  PersonalTaskItem,
  UserProfile,
} from "@/types/app";
import { getAvatarClass, getDeadlineMeta, getInitials } from "@/lib/helpers";
import { AuthScreen } from "./AuthScreen";
import { PersonalView } from "./PersonalView";
import { GroupView } from "./GroupView";

interface DashboardAppProps {
  initialUser: UserProfile | null;
  initialPersonalTasks: PersonalTaskItem[];
  initialGroups: GroupItem[];
  initialNotifications: NotificationItem[];
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("tugasku-theme-change", callback);
  return () => window.removeEventListener("tugasku-theme-change", callback);
}

function getThemeSnapshot(): boolean {
  const saved = localStorage.getItem("tugasku_theme");
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function subscribeNotifPermission(callback: () => void) {
  window.addEventListener("tugasku-notif-change", callback);
  return () => window.removeEventListener("tugasku-notif-change", callback);
}

function getNotifSnapshot(): string {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export function DashboardApp({
  initialUser,
  initialPersonalTasks,
  initialGroups,
  initialNotifications,
}: DashboardAppProps) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [personalTasks, setPersonalTasks] =
    useState<PersonalTaskItem[]>(initialPersonalTasks);
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const [mode, setMode] = useState<"mandiri" | "kelompok">("kelompok");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroups[0]?.id ?? null
  );
  const [showNotifs, setShowNotifs] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const darkMode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);
  const notifPermission = useSyncExternalStore(
    subscribeNotifPermission,
    getNotifSnapshot,
    () => "default"
  );

  const seenNotifIds = useRef<Set<string>>(
    new Set(initialNotifications.map((n) => n.id))
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  function toggleDarkMode() {
    localStorage.setItem("tugasku_theme", !darkMode ? "dark" : "light");
    window.dispatchEvent(new Event("tugasku-theme-change"));
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  }

  const refreshAll = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = (await meRes.json()) as { user: UserProfile | null };
    if (!meData.user) {
      setUser(null);
      return;
    }
    setUser(meData.user);

    const [pRes, gRes, nRes] = await Promise.all([
      fetch("/api/personal-tasks"),
      fetch("/api/groups"),
      fetch("/api/notifications"),
    ]);

    if (pRes.ok) {
      const pData = (await pRes.json()) as { tasks: PersonalTaskItem[] };
      setPersonalTasks(pData.tasks);
    }
    if (gRes.ok) {
      const gData = (await gRes.json()) as { groups: GroupItem[] };
      setGroups(gData.groups);
      setSelectedGroupId((prev) =>
        prev && gData.groups.some((g) => g.id === prev)
          ? prev
          : gData.groups[0]?.id ?? null
      );
    }
    if (nRes.ok) {
      const nData = (await nRes.json()) as { notifications: NotificationItem[] };
      // Fire browser/phone push notification for brand-new unread items
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        nData.notifications.forEach((n) => {
          if (!n.isRead && !seenNotifIds.current.has(n.id)) {
            new Notification("TugasKu", { body: n.message, icon: "/icon.svg" });
          }
          seenNotifIds.current.add(n.id);
        });
      }
      setNotifications(nData.notifications);
    }
  }, []);

  // Auto-sync every 8 seconds so teammate updates appear smoothly
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      void refreshAll();
    }, 8000);
    return () => clearInterval(timer);
  }, [user, refreshAll]);

  async function requestPushPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("Browser ini belum mendukung notifikasi push.");
      return;
    }
    const perm = await Notification.requestPermission();
    window.dispatchEvent(new Event("tugasku-notif-change"));
    if (perm === "granted") {
      showToast("Notif HP/Browser aktif!");
      new Notification("TugasKu", {
        body: "Pengingat tugas & colekan teman akan muncul di sini.",
        icon: "/icon.svg",
      });
    } else {
      showToast("Izin notifikasi ditolak di browser.");
    }
  }

  async function markNotificationsRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setPersonalTasks([]);
    setGroups([]);
    setNotifications([]);
  }

  // Urgent reminder calculation across both personal & group tasks
  const urgentSummary = useMemo(() => {
    if (!user) return { personal: 0, group: 0, total: 0 };
    const personal = personalTasks.filter(
      (t) => !t.done && t.remindEnabled && getDeadlineMeta(t.dueDate, false).isUrgent
    ).length;

    let group = 0;
    groups.forEach((g) => {
      g.tasks.forEach((t) => {
        if (
          t.assigneeId === user.id &&
          t.status !== "done" &&
          getDeadlineMeta(t.dueDate, false).isUrgent
        ) {
          group += 1;
        }
      });
    });

    return { personal, group, total: personal + group };
  }, [user, personalTasks, groups]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) {
    return (
      <AuthScreen
        darkMode={darkMode}
        onToggleDark={toggleDarkMode}
        onSuccess={() => void refreshAll()}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">TugasKu</h1>
              <p className="text-xs text-[var(--muted)]">
                Mandiri & Kelompok
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setMode("mandiri")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                mode === "mandiri"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Tugas Mandiri
            </button>
            <button
              type="button"
              onClick={() => setMode("kelompok")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                mode === "kelompok"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Tugas Kelompok
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={toggleDarkMode}
              title="Ganti tema"
              className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowNotifs((v) => !v)}
              aria-label="Notifikasi"
              className="relative p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-3.5 z-40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Reminder & Notif</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markNotificationsRead}
                      className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>

                {notifPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-medium text-left cursor-pointer"
                  >
                    Aktifkan Notif ke HP / Browser
                  </button>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] py-2">
                      Belum ada notifikasi.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          n.isRead
                            ? "bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]"
                            : "bg-indigo-500/10 border-indigo-500/25 font-medium"
                        }`}
                      >
                        {n.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
              <span
                title={user.name}
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${getAvatarClass(
                  user.avatarColor
                )}`}
              >
                {getInitials(user.name)}
              </span>
              <span className="text-xs font-medium hidden sm:inline">
                {user.name.split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Unified Urgent Reminder Banner */}
        {!bannerDismissed && urgentSummary.total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#D97706] dark:text-amber-400" />
              <span className="font-medium">
                Kamu punya {urgentSummary.total} tugas mepet deadline (
                {urgentSummary.personal} Mandiri, {urgentSummary.group} Kelompok).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Active View */}
        {mode === "mandiri" ? (
          <PersonalView
            tasks={personalTasks}
            onRefresh={refreshAll}
            onToast={showToast}
          />
        ) : (
          <GroupView
            currentUser={user}
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onRefresh={refreshAll}
            onToast={showToast}
          />
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 px-4 py-2.5 rounded-xl bg-[var(--text)] text-[var(--bg)] text-xs font-semibold shadow-lg z-50">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
