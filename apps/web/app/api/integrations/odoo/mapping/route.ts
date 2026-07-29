import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { SESSION_COOKIE } from "../../../../../lib/session";

export async function PATCH(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  const society = request.nextUrl.searchParams.get("society") ?? "";
  const body = await request.json();

  try {
    const result = await apiFetch(`/integrations/odoo/mapping?society=${encodeURIComponent(society)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
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
