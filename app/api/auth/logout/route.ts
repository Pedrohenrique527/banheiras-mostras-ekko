export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": "ekko_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" } },
  );
}
