import { NextResponse } from "next/server";
import { getAuthenticatedStudentForApi } from "@/lib/requireAuthStudent";

export async function GET() {
  const student = await getAuthenticatedStudentForApi();
  if (!student) {
    return NextResponse.json({ student: null }, { status: 401 });
  }
  return NextResponse.json({ student });
}
