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

  const passwordHash = await hashPassword(password);
  if (!user || !user.active || user.password_hash !== passwordHash) {
    return Response.json({ error: "E-mail ou senha invalidos." }, { status: 401 });
  }

  const isInitialPassword = passwordHash === await hashPassword("12345678");
  const mustChangePassword = Boolean(user.must_change_password) || isInitialPassword;
  if (isInitialPassword && !user.must_change_password) await firestore().collection("users").doc(userDoc.id).update({ must_change_password: true });
  const safeUser = { id: userDoc.id, name: user.name, email: user.email, role: user.role, is_owner: Boolean(user.is_owner), must_change_password: mustChangePassword };
  return Response.json(safeUser, {
    headers: {
      "Set-Cookie": `ekko_session=${encodeURIComponent(userDoc.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
    },
  });
}
