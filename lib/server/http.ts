import { NextResponse } from "next/server";

export function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

export function errorJson(error: string, status = 400) {
  return json({ error }, status);
}
