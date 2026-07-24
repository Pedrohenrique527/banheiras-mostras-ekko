import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "crypto";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Gerente" | "Usuario" | "Usuário";
  active?: boolean | number;
  is_owner?: boolean;
  must_change_password?: boolean;
  created_at?: string;
};

const defaultLocations = [
  "CD Iraja",
  "Ekko Barra",
  "Ekko Niteroi",
  "Ekko Tijuca",
  "Mostra Artefacto",
  "Mostra Mastercasa",
  "Cliente",
  "Assistencia tecnica",
  "Local nao identificado",
];

function firebaseCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"));
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Configure as variaveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.");
  }

  return { projectId, clientEmail, privateKey };
}

export function firebaseApp() {
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert(firebaseCredentials()),
  });
}

export function firestore() {
  return getFirestore(firebaseApp());
}

export async function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function sessionUserId(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)ekko_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function ensureFirebaseSeed() {
  const db = firestore();
  const metaRef = db.collection("system_meta").doc("seed");
  const meta = await metaRef.get();
  if (meta.exists) return;

  const users = await db.collection("users").limit(1).get();
  const locations = await db.collection("locations").limit(1).get();
  const batch = db.batch();
  const now = new Date().toISOString();

  if (locations.empty) {
    defaultLocations.forEach((name) => {
      const ref = db.collection("locations").doc(id("LOC"));
      batch.set(ref, { id: ref.id, name, type: "Operacao", created_at: now });
    });
  }

  if (users.empty) {
    const adminRef = db.collection("users").doc(id("USR"));
    batch.set(adminRef, {
      id: adminRef.id,
      name: "Administrador Ekko",
      email: "admin@ekko.com.br",
      email_normalized: "admin@ekko.com.br",
      password_hash: await hashPassword("Ekko@2026"),
      role: "Administrador",
      is_owner: true,
      active: true,
      created_at: now,
    });
  }

  batch.set(metaRef, { initialized_at: now });
  await batch.commit();
}

export async function actorFromRequest(request: Request): Promise<AppUser> {
  await ensureFirebaseSeed();
  const userId = sessionUserId(request);
  if (!userId) throw new Error("Sessao expirada. Entre novamente.");

  const snap = await firestore().collection("users").doc(userId).get();
  if (!snap.exists) throw new Error("Sessao de usuario nao encontrada.");

  const user = snap.data() as AppUser;
  if (!user.active) throw new Error("Usuario inativo.");
  return user;
}

export function isManager(role: string) {
  return role === "Administrador" || role === "Gerente";
}
