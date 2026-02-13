import { NextResponse } from "next/server";

const FILTERED_EMAILS = new Set([
  "c1_00695070@op.micro-agi.com",
  "c1_60903228@op.micro-agi.com",
  "c1_70996366@op.micro-agi.com",
  "c1_41284911@op.micro-agi.com",
  "c1_99172099@op.micro-agi.com",
  "c1_51659213@op.micro-agi.com",
  "c1_11895557@op.micro-agi.com",
  "c1_77501884@op.micro-agi.com",
  "c1_80646651@op.micro-agi.com",
  "c1_61492431@op.micro-agi.com",
  "c1_91282033@op.micro-agi.com",
  "c1_28082123@op.micro-agi.com",
  "c1_53309119@op.micro-agi.com",
  "c1_57457232@op.micro-agi.com",
  "c1_58844194@op.micro-agi.com",
  "c1_01937485@op.micro-agi.com",
  "c1_22760194@op.micro-agi.com",
  "c1_64124857@op.micro-agi.com",
  "c1_93991840@op.micro-agi.com",
  "c1_38236023@op.micro-agi.com",
  "c1_11226011@op.micro-agi.com",
  "c1_13080118@op.micro-agi.com",
  "c1_36548915@op.micro-agi.com",
  "c1_89734684@op.micro-agi.com",
  "c1_53958268@op.micro-agi.com",
  "c1_15241670@op.micro-agi.com",
  "c1_21916331@op.micro-agi.com",
  "c1_56113658@op.micro-agi.com",
  "c1_18075359@op.micro-agi.com",
  "c1_20833689@op.micro-agi.com",
  "c1_61815891@op.micro-agi.com",
  "c1_07672642@op.micro-agi.com",
  "c1_14271322@op.micro-agi.com",
  "c1_66881236@op.micro-agi.com",
  "c1_75852147@op.micro-agi.com",
  "c1_18135622@op.micro-agi.com",
  "c1_25228714@op.micro-agi.com",
  "c1_43862480@op.micro-agi.com",
  "c1_60974777@op.micro-agi.com",
  "c1_55116654@op.micro-agi.com",
  "c1_09928203@op.micro-agi.com",
  "c1_50635480@op.micro-agi.com",
  "c1_45270313@op.micro-agi.com",
  "c1_50186901@op.micro-agi.com",
  "c1_93500508@op.micro-agi.com",
  "c1_55350273@op.micro-agi.com",
  "c1_48183117@op.micro-agi.com",
  "c1_42526406@op.micro-agi.com",
  "c1_19177086@op.micro-agi.com",
  "c1_76297539@op.micro-agi.com",
  "c1_30990773@op.micro-agi.com",
  "c1_52281883@op.micro-agi.com",
  "c1_59323644@op.micro-agi.com",
  "c1_26648865@op.micro-agi.com",
  "c1_52090027@op.micro-agi.com",
  "c1_44955759@op.micro-agi.com",
  "c1_79708178@op.micro-agi.com",
  "c1_48039753@op.micro-agi.com",
  "c1_12543131@op.micro-agi.com",
  "c1_86183692@op.micro-agi.com",
  "c1_91231581@op.micro-agi.com",
  "c1_72359269@op.micro-agi.com",
  "c1_22007073@op.micro-agi.com",
  "c1_41214000@op.micro-agi.com",
  "c1_07357973@op.micro-agi.com",
  "c1_14513633@op.micro-agi.com",
  "c1_41101357@op.micro-agi.com",
  "c1_85273275@op.micro-agi.com",
  "c1_30927241@op.micro-agi.com",
  "c1_72779800@op.micro-agi.com",
  "c1_27875091@op.micro-agi.com",
  "c1_98088216@op.micro-agi.com",
  "c1_05304642@op.micro-agi.com",
  "c1_09273087@op.micro-agi.com",
  "c1_08961982@op.micro-agi.com",
]);

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

async function fetchAllUsers(token: string): Promise<D8AUser[]> {
  const allUsers: D8AUser[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${process.env.D8A_API_BASE}/organizations/${process.env.D8A_ORG_ID}/users?limit=${limit}&offset=${offset}&sort=last_upload&tz=America%2FLos_Angeles`;
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

export async function GET() {
  try {
    const token = await getIdToken();
    const allUsers = await fetchAllUsers(token);
    const filtered = allUsers.filter((u) => FILTERED_EMAILS.has(u.email));

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
