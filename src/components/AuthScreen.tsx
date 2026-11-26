"use client";

import { useState } from "react";
import { CheckCircle2, Moon, Sun } from "lucide-react";

interface AuthScreenProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onSuccess: () => void;
}

export function AuthScreen({ darkMode, onToggleDark, onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan.");
        return;
      }
      onSuccess();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function quickDemoLogin(demoEmail: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "mahasiswa" }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        setError("Gagal masuk akun demo.");
      }
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <button
        onClick={onToggleDark}
        aria-label="Ganti tema"
        className="fixed top-4 right-4 p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--primary)] text-white shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TugasKu</h1>
          <p className="text-xs text-[var(--muted)]">
            Tracker tugas mandiri & kelompok anti-ghosting.
          </p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                mode === "login"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                mode === "register"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rafi Pratama"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Email Kampus / Pribadi
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@kampus.ac.id"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {loading
                ? "Memproses..."
                : mode === "login"
                ? "Masuk Sekarang"
                : "Buat Akun"}
            </button>
          </form>

          <div className="pt-3 border-t border-[var(--border)] space-y-2">
            <p className="text-xs text-center text-[var(--muted)]">
              Mau coba cepat? Masuk akun demo:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => quickDemoLogin("rafi@kampus.ac.id")}
                className="py-2 px-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-medium cursor-pointer"
              >
                Rafi (Ketua)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => quickDemoLogin("sinta@kampus.ac.id")}
                className="py-2 px-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-medium cursor-pointer"
              >
                Sinta (Anggota)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
