import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";

/// Proxy serveur vers NestJS — création d'une personne (Core Directory), réservée
/// au RH de la société cible. Le token de session (httpOnly) ne quitte jamais le serveur.
export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  const body = await request.json();

  try {
    const result = await apiFetch("/people", { method: "POST", body: JSON.stringify(body), token });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erreur de connexion à l'API." }, { status: 502 });
  }
}
