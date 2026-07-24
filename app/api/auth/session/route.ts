import { actorFromRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await actorFromRequest(request);
    return Response.json({ id: user.id, name: user.name, email: user.email, role: user.role, is_owner: Boolean(user.is_owner), must_change_password: Boolean(user.must_change_password) });
  } catch {
    return Response.json({ error: "Nao autenticado." }, { status: 401 });
  }
}
