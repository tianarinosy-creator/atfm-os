import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "../../../../lib/api";
import { SESSION_COOKIE } from "../../../../lib/session";

/// Proxy serveur vers NestJS : le JWT ne transite jamais côté client, il est posé
/// ici dans un cookie httpOnly (cf. section 9 du dossier — pas de secret exposé au navigateur).
export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  try {
    const { accessToken, user } = await apiFetch<{ accessToken: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erreur de connexion à l'API." }, { status: 502 });
  }
}
