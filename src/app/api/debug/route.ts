import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.FIREBASE_REFRESH_TOKEN || "";
  return NextResponse.json({
    tokenLength: token.length,
    tokenStart: token.slice(0, 10),
    tokenEnd: token.slice(-10),
    hasQuotes: token.startsWith('"') || token.endsWith('"'),
    hasNewline: token.includes("\n"),
    hasSpace: token.includes(" "),
    apiKeyLength: (process.env.FIREBASE_API_KEY || "").length,
  });
}
