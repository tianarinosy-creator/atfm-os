import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { SESSION_COOKIE } from "../../../../../lib/session";

export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  const society = request.nextUrl.searchParams.get("society") ?? "";

  try {
    const result = await apiFetch(`/integrations/odoo/import?society=${encodeURIComponent(society)}`, {
      method: "POST",
      token,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erreur de connexion à l'API." }, { status: 502 });
  }
}
