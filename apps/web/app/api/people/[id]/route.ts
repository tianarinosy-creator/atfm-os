import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "../../../../lib/api";
import { SESSION_COOKIE } from "../../../../lib/session";

/// Proxy serveur vers NestJS — fiche détaillée d'une personne (utilisée pour
/// pré-remplir le formulaire d'édition, y compris les champs sensibles que
/// l'API masque déjà elle-même hors RH de la société concernée).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  try {
    const result = await apiFetch(`/people/${params.id}`, { token });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erreur de connexion à l'API." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  const body = await request.json();

  try {
    const result = await apiFetch(`/people/${params.id}`, { method: "PATCH", body: JSON.stringify(body), token });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erreur de connexion à l'API." }, { status: 502 });
  }
}
