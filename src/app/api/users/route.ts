import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const EMAILS_URL =
  "https://raw.githubusercontent.com/shas232/d8a-dashboard/main/emails.json";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedEmails: Set<string> | null = null;
let cacheTimestamp = 0;

async function getFilteredEmails(): Promise<Set<string>> {
  if (cachedEmails && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEmails;
  }

  try {
    const res = await fetch(EMAILS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
    const emails: string[] = await res.json();
    cachedEmails = new Set(emails.map((e) => e.toLowerCase().trim()));
    cacheTimestamp = Date.now();
    return cachedEmails;
  } catch {
    // Fallback to local emails.json
    const raw = readFileSync(join(process.cwd(), "emails.json"), "utf-8");
    const emails: string[] = JSON.parse(raw);
    cachedEmails = new Set(emails.map((e) => e.toLowerCase().trim()));
    cacheTimestamp = Date.now();
    return cachedEmails;
  }
}

interface D8AUser {
  email: string;
  resourceKey: string;
  createdAt: string;
  lastUploadCreatedAt: string | null;
  quotaLimitMs: number | null;
  quotaWindowDays: number | null;
  disabled: boolean;
  uploadCount: number;
  totalDurationMs: number;
}

async function getIdToken(): Promise<string> {
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: process.env.FIREBASE_REFRESH_TOKEN,
      }),
    }
  );
  const data = await res.json();
  if (!data.id_token) {
    throw new Error(
      `Failed to refresh token. Status: ${res.status}. ` +
      `Has API key: ${!!process.env.FIREBASE_API_KEY}. ` +
      `Has refresh token: ${!!process.env.FIREBASE_REFRESH_TOKEN}. ` +
      `Response: ${JSON.stringify(data).slice(0, 200)}`
    );
  }
  return data.id_token;
}

async function fetchAllUsers(token: string, startDate: string | null): Promise<D8AUser[]> {
  const allUsers: D8AUser[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    let url = `${process.env.D8A_API_BASE}/organizations/${process.env.D8A_ORG_ID}/users?limit=${limit}&offset=${offset}&sort=last_upload&tz=America%2FLos_Angeles`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Origin: "https://d8acollect.video",
      },
    });
    const data = await res.json();
    allUsers.push(...(data.users || []));
    if (!data.hasMore) break;
    offset = data.nextOffset;
  }

  return allUsers;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const token = await getIdToken();
    const allUsers = await fetchAllUsers(token, startDate);
    const filteredEmails = await getFilteredEmails();
    const filtered = allUsers.filter((u) => filteredEmails.has(u.email));

    const totalUsers = filtered.length;
    const activeUsers = filtered.filter((u) => u.uploadCount > 0).length;
    const totalUploads = filtered.reduce((s, u) => s + u.uploadCount, 0);
    const totalDurationMs = filtered.reduce((s, u) => s + u.totalDurationMs, 0);

    return NextResponse.json({
      summary: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalUploads,
        totalMinutes: Math.round((totalDurationMs / 1000 / 60) * 10) / 10,
        totalHours: Math.round((totalDurationMs / 1000 / 60 / 60) * 10) / 10,
      },
      users: filtered.sort(
        (a, b) => b.totalDurationMs - a.totalDurationMs
      ),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("API Error:", message);
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        detail: message,
        hasEnvVars: {
          FIREBASE_API_KEY: !!process.env.FIREBASE_API_KEY,
          FIREBASE_REFRESH_TOKEN: !!process.env.FIREBASE_REFRESH_TOKEN,
          D8A_ORG_ID: !!process.env.D8A_ORG_ID,
          D8A_API_BASE: !!process.env.D8A_API_BASE,
        },
      },
      { status: 500 }
    );
  }
}
