import { actorFromRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await actorFromRequest(request);
    return Response.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch {
    return Response.json({ error: "Nao autenticado." }, { status: 401 });
  }
}
