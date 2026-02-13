"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  email: string;
  resourceKey: string;
  createdAt: string;
  lastUploadCreatedAt: string | null;
  uploadCount: number;
  totalDurationMs: number;
  disabled: boolean;
}

interface Summary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalUploads: number;
  totalMinutes: number;
  totalHours: number;
}

interface ApiResponse {
  summary: Summary;
  users: User[];
  fetchedAt: string;
}

function formatMinutes(ms: number): string {
  const mins = ms / 1000 / 60;
  if (mins < 1) return `${(ms / 1000).toFixed(0)}s`;
  return `${mins.toFixed(1)} min`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"totalDurationMs" | "uploadCount" | "lastUploadCreatedAt">("totalDurationMs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"dashboard" | "users">("dashboard");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load data. Check your connection and credentials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedUsers = data?.users
    ?.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "totalDurationMs") cmp = a.totalDurationMs - b.totalDurationMs;
      else if (sortField === "uploadCount") cmp = a.uploadCount - b.uploadCount;
      else {
        const aDate = a.lastUploadCreatedAt || "";
        const bDate = b.lastUploadCreatedAt || "";
        cmp = aDate.localeCompare(bDate);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-zinc-300 dark:text-zinc-600 ml-1">&#8597;</span>;
    return <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-200" />
          <p className="text-sm text-zinc-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data!.summary;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Praxo Labs
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {data ? formatDate(data.fetchedAt) : "—"}
            </p>
          </div>
          <div className="flex gap-2">
          <button
            onClick={() => setTab(tab === "dashboard" ? "users" : "dashboard")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "users"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Users
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-white dark:border-zinc-600 dark:border-t-zinc-900" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
          </div>
        </div>

        {tab === "users" ? (
          /* Manage Users View */
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Filtered Users ({data?.users.length || 0})
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Email addresses being tracked</p>
              </div>
              <button
                onClick={() => setTab("dashboard")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data?.users
                .slice()
                .sort((a, b) => a.email.localeCompare(b.email))
                .map((user, i) => (
                <div
                  key={user.resourceKey}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-6">{i + 1}</span>
                    <span className="font-mono text-sm text-zinc-900 dark:text-zinc-200">
                      {user.email}
                    </span>
                  </div>
                  <StatusBadge active={user.uploadCount > 0} />
                </div>
              ))}
            </div>
          </div>
        ) : (
        <>
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Total Users", value: summary.totalUsers, color: "text-zinc-900 dark:text-zinc-100" },
            { label: "Active", value: summary.activeUsers, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Inactive", value: summary.inactiveUsers, color: "text-zinc-500" },
            { label: "Total Uploads", value: summary.totalUploads, color: "text-blue-600 dark:text-blue-400" },
            { label: "Total Recorded", value: `${summary.totalMinutes} min`, sub: `${summary.totalHours} hrs`, color: "text-purple-600 dark:text-purple-400" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {card.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${card.color}`}>
                {card.value}
              </p>
              {"sub" in card && card.sub && (
                <p className="text-xs text-zinc-400">{card.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 sm:max-w-xs"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onClick={() => handleSort("uploadCount")}
                  >
                    Uploads <SortIcon field="uploadCount" />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium bg-purple-50 text-purple-700 hover:text-purple-900 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:text-purple-100"
                    onClick={() => handleSort("totalDurationMs")}
                  >
                    Duration <SortIcon field="totalDurationMs" />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onClick={() => handleSort("lastUploadCreatedAt")}
                  >
                    Last Upload <SortIcon field="lastUploadCreatedAt" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedUsers?.map((user, i) => (
                  <tr
                    key={user.resourceKey}
                    className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-200">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={user.uploadCount > 0} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-200">
                      {user.uploadCount}
                    </td>
                    <td className="px-4 py-3 text-right font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                      {formatMinutes(user.totalDurationMs)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(user.lastUploadCreatedAt)}
                    </td>
                  </tr>
                ))}
                {sortedUsers?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
