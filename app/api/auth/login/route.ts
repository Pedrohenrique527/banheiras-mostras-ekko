import { ensureFirebaseSeed, firestore, hashPassword } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { email = "", password = "" } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  await ensureFirebaseSeed();

  const normalizedEmail = email.trim().toLowerCase();
  const users = await firestore()
    .collection("users")
    .where("email_normalized", "==", normalizedEmail)
    .limit(1)
    .get();

  const userDoc = users.docs[0];
  const user = userDoc?.data() as Record<string, string | boolean> | undefined;

  if (!user || !user.active || user.password_hash !== (await hashPassword(password))) {
    return Response.json({ error: "E-mail ou senha invalidos." }, { status: 401 });
  }

  const safeUser = { id: userDoc.id, name: user.name, email: user.email, role: user.role };
  return Response.json(safeUser, {
    headers: {
      "Set-Cookie": `ekko_session=${encodeURIComponent(userDoc.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
    },
  });
}
