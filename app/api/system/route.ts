import { actorFromRequest, ensureFirebaseSeed, firestore, hashPassword, id, isManager } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

type FirestoreDoc = { id: string; data(): AnyRecord | undefined };

function withId(doc: FirestoreDoc): AnyRecord {
  return { id: doc.id, ...(doc.data() || {}) };
}

function sortDesc(field: string) {
  return (a: AnyRecord, b: AnyRecord) => String(b[field] || "").localeCompare(String(a[field] || ""));
}

function visibleMaterial(material: AnyRecord) {
  return material.status !== "Excluido" && material.status !== "Excluído";
}

function normalizeStatus(location: string) {
  const local = location.toLowerCase();
  if (local.includes("cliente")) return "Em cliente";
  if (local.includes("mostra") || local.includes("ekko") || local.includes("artefacto") || local.includes("mastercasa")) return "Em exposicao";
  if (local.includes("assistencia")) return "Em manutencao";
  if (local.includes("nao identificado")) return "Nao localizado";
  return "Disponivel";
}

function isOwner(actor: AnyRecord) {
  if (actor.is_owner === true) return true;
  const ownerEmail = (process.env.SYSTEM_OWNER_EMAIL || "admin@ekko.com.br").toLowerCase();
  return String(actor.email || "").toLowerCase() === ownerEmail;
}

async function getSystemData() {
  await ensureFirebaseSeed();
  const db = firestore();
  const [materialsSnap, movementsSnap, auditSnap, usersSnap, locationsSnap, messagesSnap, announcementsSnap] = await Promise.all([
    db.collection("materials").get(),
    db.collection("movements").get(),
    db.collection("audit_logs").get(),
    db.collection("users").get(),
    db.collection("locations").get(),
    db.collection("chat_messages").get(),
    db.collection("announcements").get(),
  ]);

  const allMaterials: AnyRecord[] = materialsSnap.docs.map(withId).sort(sortDesc("updated_at"));
  const materials: AnyRecord[] = allMaterials.filter(visibleMaterial);
  const removedMaterials = allMaterials.filter((item) => !visibleMaterial(item)).sort(sortDesc("removed_at"));
  const users: AnyRecord[] = usersSnap.docs.map(withId).sort((a: AnyRecord, b: AnyRecord) => String(a.name).localeCompare(String(b.name)));
  const locations: AnyRecord[] = locationsSnap.docs.map(withId).sort((a: AnyRecord, b: AnyRecord) => String(a.name).localeCompare(String(b.name)));
  const userById = new Map(users.map((user) => [user.id, user]));
  const materialById = new Map(allMaterials.map((material) => [material.id, material]));

  const movements = movementsSnap.docs.map((doc) => {
    const movement = withId(doc);
    const material = materialById.get(movement.material_id) || ({} as AnyRecord);
    const user = userById.get(movement.user_id) || ({} as AnyRecord);
    return {
      ...movement,
      material_name: material.name || "Produto removido",
      material_code: material.code || "",
      user_name: user.name || "Usuario",
    };
  }).sort(sortDesc("moved_at")).slice(0, 200);

  const auditLogs = auditSnap.docs.map((doc) => {
    const log = withId(doc);
    const material = materialById.get(log.material_id) || ({} as AnyRecord);
    const user = userById.get(log.user_id) || ({} as AnyRecord);
    return {
      ...log,
      material_name: material.name || "",
      material_code: material.code || "",
      user_name: user.name || "Usuario",
    };
  }).sort(sortDesc("created_at")).slice(0, 300);

  const messages = messagesSnap.docs.map((doc) => {
    const message = withId(doc);
    const user = userById.get(message.user_id) || ({} as AnyRecord);
    return { ...message, user_name: user.name || "Usuario" };
  }).sort((a: AnyRecord, b: AnyRecord) => String(a.created_at || "").localeCompare(String(b.created_at || ""))).slice(-200);

  const announcements = announcementsSnap.docs.map((doc) => {
    const announcement = withId(doc);
    const user = userById.get(announcement.user_id) || ({} as AnyRecord);
    return { ...announcement, user_name: user.name || "Usuario" };
  }).filter((announcement: AnyRecord) => !announcement.deleted_at).sort((a: AnyRecord, b: AnyRecord) => Number(b.pinned || 0) - Number(a.pinned || 0) || String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 30);

  return {
    materials,
    removedMaterials,
    movements,
    auditLogs,
    users: users.map((record: AnyRecord) => {
      const { password_hash, email_normalized, ...user } = record;
      return user;
    }),
    locations,
    messages,
    announcements,
  };
}

export async function GET(request: Request) {
  try {
    await actorFromRequest(request);
    return Response.json(await getSystemData());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Acesso invalido." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AnyRecord;
  const db = firestore();
  const action = String(payload.action || "");
  const now = new Date().toISOString();

  let actor: AnyRecord;
  try {
    actor = await actorFromRequest(request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Acesso invalido." }, { status: 401 });
  }

  if (action === "createMaterial") {
    const material = payload.material as Record<string, string>;
    if (!material.photo_url) return Response.json({ error: "Adicione uma foto do produto antes de continuar." }, { status: 400 });

    const materialId = id("MAT");
    const currentLocation = material.current_location || "CD Iraja";
    const record = {
      id: materialId,
      name: material.name,
      code: material.code,
      photo_url: material.photo_url,
      category: material.category,
      brand: material.brand || "",
      model: material.model || "",
      color: material.color || "",
      dimensions: material.dimensions || "",
      description: material.description || "",
      source_ref: material.source_ref || "",
      invoice_number: material.invoice_number || "",
      invoice_date: material.invoice_date || "",
      invoice_link: material.invoice_link || "",
      invoice_note: material.invoice_note || "",
      status: material.status || "Disponivel",
      current_location: currentLocation,
      registered_by: actor.name,
      last_changed_by: actor.name,
      entry_date: material.entry_date || now.slice(0, 10),
      last_movement_at: now,
      created_at: now,
      updated_at: now,
    };

    const batch = db.batch();
    batch.set(db.collection("materials").doc(materialId), record);
    const movementId = id("MOV");
    const auditId = id("AUD");
    batch.set(db.collection("movements").doc(movementId), {
      id: movementId,
      material_id: materialId,
      user_id: actor.id,
      previous_location: "Novo cadastro",
      new_location: currentLocation,
      note: "Entrada no sistema",
      moved_at: now,
    });
    batch.set(db.collection("audit_logs").doc(auditId), {
      id: auditId,
      user_id: actor.id,
      action: "Cadastro",
      material_id: materialId,
      changed_field: "Material",
      previous_value: null,
      new_value: material.name,
      created_at: now,
    });
    await batch.commit();
    return Response.json({ ok: true, id: materialId }, { status: 201 });
  }

  if (action === "updateMaterial") {
    const materialId = String(payload.materialId);
    const incoming = payload.material as Record<string, string>;
    const ref = db.collection("materials").doc(materialId);
    const currentSnap = await ref.get();
    const current = currentSnap.data() as AnyRecord | undefined;
    if (!current || !visibleMaterial(current)) return Response.json({ error: "Produto nao encontrado." }, { status: 404 });

    const fields = ["name", "code", "photo_url", "category", "brand", "model", "color", "dimensions", "description", "source_ref", "invoice_number", "invoice_date", "invoice_link", "invoice_note", "entry_date", "status"];
    const labels: Record<string, string> = { name: "Nome", code: "Codigo", photo_url: "Foto", category: "Categoria", brand: "Marca", model: "Modelo", color: "Cor", dimensions: "Dimensoes", description: "Observacoes", source_ref: "Pedido / referencia", invoice_number: "Numero da nota fiscal", invoice_date: "Data da nota fiscal", invoice_link: "Link da nota fiscal", invoice_note: "Observacao da nota fiscal", entry_date: "Data de entrada", status: "Status" };
    const changes = fields.filter((field) => String(current[field] || "") !== String(incoming[field] || ""));

    if (changes.length === 0) return Response.json({ ok: true });

    const update = Object.fromEntries(fields.map((field) => [field, incoming[field] || null]));
    await ref.update({ ...update, last_changed_by: actor.name, updated_at: now });

    const batch = db.batch();
    changes.forEach((field) => {
      const auditId = id("AUD");
      batch.set(db.collection("audit_logs").doc(auditId), {
        id: auditId,
        user_id: actor.id,
        action: "Edicao de produto",
        material_id: materialId,
        changed_field: labels[field],
        previous_value: current[field] || null,
        new_value: incoming[field] || null,
        created_at: now,
      });
    });
    await batch.commit();
    return Response.json({ ok: true });
  }

  if (action === "moveMaterial") {
    const materialId = String(payload.materialId);
    const newLocation = String(payload.newLocation || "");
    const note = String(payload.note || "");
    const ref = db.collection("materials").doc(materialId);
    const snap = await ref.get();
    const material = snap.data() as AnyRecord | undefined;
    if (!material || !visibleMaterial(material)) return Response.json({ error: "Produto nao encontrado." }, { status: 404 });
    if (material.current_location === newLocation) return Response.json({ error: "Escolha um local diferente do atual." }, { status: 400 });

    const movementId = id("MOV");
    const auditId = id("AUD");
    const batch = db.batch();
    batch.update(ref, {
      current_location: newLocation,
      status: normalizeStatus(newLocation),
      last_changed_by: actor.name,
      last_movement_at: now,
      updated_at: now,
    });
    batch.set(db.collection("movements").doc(movementId), {
      id: movementId,
      material_id: materialId,
      user_id: actor.id,
      previous_location: material.current_location,
      new_location: newLocation,
      note,
      moved_at: now,
    });
    batch.set(db.collection("audit_logs").doc(auditId), {
      id: auditId,
      user_id: actor.id,
      action: "Alteracao de localizacao",
      material_id: materialId,
      changed_field: "Localizacao",
      previous_value: material.current_location,
      new_value: newLocation,
      created_at: now,
    });
    await batch.commit();
    return Response.json({ ok: true });
  }

  if (action === "removeMaterial") {
    if (!isManager(actor.role)) return Response.json({ error: "Somente administradores e gerentes podem remover produtos." }, { status: 403 });
    const materialId = String(payload.materialId);
    const removalLocation = String(payload.removalLocation || "").trim();
    const reason = String(payload.reason || "").trim();
    if (!removalLocation || !reason) return Response.json({ error: "Informe onde e por que o produto foi removido." }, { status: 400 });

    const ref = db.collection("materials").doc(materialId);
    const snap = await ref.get();
    const material = snap.data() as AnyRecord | undefined;
    if (!material || !visibleMaterial(material)) return Response.json({ error: "Produto nao encontrado." }, { status: 404 });

    const batch = db.batch();
    batch.update(ref, {
      status: "Excluido",
      removed_by: actor.name,
      removal_reason: reason,
      removal_location: removalLocation,
      removed_at: now,
      last_changed_by: actor.name,
      updated_at: now,
    });
    const auditId = id("AUD");
    batch.set(db.collection("audit_logs").doc(auditId), {
      id: auditId,
      user_id: actor.id,
      action: "Remocao de produto",
      material_id: materialId,
      changed_field: `Removido em: ${removalLocation}`,
      previous_value: material.current_location,
      new_value: reason,
      created_at: now,
    });
    await batch.commit();
    return Response.json({ ok: true });
  }

  if (action === "createUser") {
    if (!isOwner(actor)) return Response.json({ error: "Somente o proprietario do sistema pode criar acessos e permissoes." }, { status: 403 });
    const newUser = payload.user as Record<string, string>;
    if (!newUser.name?.trim() || !newUser.email?.trim()) return Response.json({ error: "Informe nome e e-mail do usuário." }, { status: 400 });
    if (!newUser.password || newUser.password.length < 8) return Response.json({ error: "A senha inicial deve ter ao menos 8 caracteres." }, { status: 400 });

    const normalizedEmail = newUser.email.trim().toLowerCase();
    const existing = await db.collection("users").where("email_normalized", "==", normalizedEmail).limit(1).get();
    if (!existing.empty) return Response.json({ error: "Ja existe um acesso com este e-mail." }, { status: 409 });

    const newUserId = id("USR");
    const batch = db.batch();
    batch.set(db.collection("users").doc(newUserId), {
      id: newUserId,
      name: newUser.name,
      email: newUser.email,
      email_normalized: normalizedEmail,
      password_hash: await hashPassword(newUser.password),
      role: ["Administrador", "Gerente", "Diretor", "Usuário", "Usuario"].includes(newUser.role) ? newUser.role : "Usuário",
      is_owner: false,
      must_change_password: true,
      active: true,
      created_at: now,
    });
    const auditId = id("AUD");
    batch.set(db.collection("audit_logs").doc(auditId), {
      id: auditId,
      user_id: actor.id,
      action: "Cadastro de usuario",
      material_id: null,
      changed_field: "Usuario",
      previous_value: null,
      new_value: newUser.email,
      created_at: now,
    });
    await batch.commit();
    return Response.json({ ok: true, id: newUserId }, { status: 201 });
  }

  if (action === "updateUserAccess") {
    if (!isOwner(actor)) return Response.json({ error: "Somente o proprietario do sistema pode alterar acessos e permissoes." }, { status: 403 });
    const targetUserId = String(payload.targetUserId || "");
    const access = payload.access as Record<string, string | boolean>;
    if (!targetUserId) return Response.json({ error: "Usuario nao informado." }, { status: 400 });
    if (targetUserId === actor.id && access.active === false) return Response.json({ error: "Voce nao pode remover o proprio acesso principal." }, { status: 400 });

    const ref = db.collection("users").doc(targetUserId);
    const snap = await ref.get();
    const target = snap.data() as AnyRecord | undefined;
    if (!target) return Response.json({ error: "Usuario nao encontrado." }, { status: 404 });

    const nextName = String(access.name || target.name || "").trim();
    const nextEmail = String(access.email || target.email || "").trim();
    if (!nextName || !nextEmail) return Response.json({ error: "Informe nome e e-mail." }, { status: 400 });
    const normalizedEmail = nextEmail.toLowerCase();
    if (normalizedEmail !== String(target.email_normalized || target.email || "").toLowerCase()) {
      const existing = await db.collection("users").where("email_normalized", "==", normalizedEmail).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== targetUserId) return Response.json({ error: "Ja existe um acesso com este e-mail." }, { status: 409 });
    }
    const requestedRole = String(access.role || target.role || "Usuario");
    const nextRole = ["Administrador", "Gerente", "Diretor", "Usuário", "Usuario"].includes(requestedRole) ? requestedRole : String(target.role || "Usuário");
    const nextActive = typeof access.active === "boolean" ? access.active : Boolean(target.active);
    const reason = String(access.reason || "").trim();
    const statusText = nextActive ? "Ativo" : "Acesso removido";
    const nextPassword = String(access.password || "").trim();
    if (nextPassword && nextPassword.length < 8) return Response.json({ error: "A nova senha deve ter ao menos 8 caracteres." }, { status: 400 });

    await ref.update({
      name: nextName,
      email: nextEmail,
      email_normalized: normalizedEmail,
      role: nextRole,
      active: nextActive,
      ...(nextPassword ? { password_hash: await hashPassword(nextPassword), must_change_password: targetUserId === actor.id ? false : true } : {}),
      ...(target.is_owner || targetUserId === actor.id ? { is_owner: true } : {}),
      access_status: statusText,
      access_reason: reason,
      access_changed_by: actor.name,
      access_changed_at: now,
      updated_at: now,
      ...(nextActive ? { restored_at: now } : { removed_at: now, removed_by: actor.name }),
    });

    const batch = db.batch();
    const roleAudit = id("AUD");
    batch.set(db.collection("audit_logs").doc(roleAudit), {
      id: roleAudit,
      user_id: actor.id,
      action: "Alteracao de permissao",
      material_id: null,
      changed_field: `Usuario: ${target.email}`,
      previous_value: target.role || "",
      new_value: nextRole,
      created_at: now,
    });
    const profileChanges: Array<[string, string, string]> = [];
    if (String(target.name || "") !== nextName) profileChanges.push(["Nome", String(target.name || ""), nextName]);
    if (String(target.email || "") !== nextEmail) profileChanges.push(["E-mail", String(target.email || ""), nextEmail]);
    if (nextPassword) profileChanges.push(["Senha", "Senha anterior", targetUserId === actor.id ? "Senha atualizada" : "Nova senha inicial"]);
    profileChanges.forEach(([field, previous, next]) => {
      const profileAudit = id("AUD");
      batch.set(db.collection("audit_logs").doc(profileAudit), {
        id: profileAudit,
        user_id: actor.id,
        action: "Alteracao de cadastro de usuario",
        material_id: null,
        changed_field: `${field}: ${target.email}`,
        previous_value: previous,
        new_value: next,
        created_at: now,
      });
    });
    if (Boolean(target.active) !== nextActive) {
      const statusAudit = id("AUD");
      batch.set(db.collection("audit_logs").doc(statusAudit), {
        id: statusAudit,
        user_id: actor.id,
        action: nextActive ? "Reativacao de acesso" : "Remocao de acesso",
        material_id: null,
        changed_field: `Usuario: ${target.email}`,
        previous_value: target.active ? "Ativo" : "Bloqueado",
        new_value: nextActive ? "Ativo" : `Bloqueado${reason ? ` - ${reason}` : ""}`,
        created_at: now,
      });
    }
    await batch.commit();
    return Response.json({ ok: true });
  }

  if (action === "changePassword") {
    const newPassword = String(payload.newPassword || "").trim();
    if (newPassword.length < 8) return Response.json({ error: "A nova senha deve ter ao menos 8 caracteres." }, { status: 400 });
    const ref = db.collection("users").doc(actor.id);
    await ref.update({ password_hash: await hashPassword(newPassword), must_change_password: false, password_changed_at: now, updated_at: now });
    const auditId = id("AUD");
    await db.collection("audit_logs").doc(auditId).set({ id: auditId, user_id: actor.id, action: "Alteracao de senha", material_id: null, changed_field: "Senha", previous_value: "Senha inicial", new_value: "Senha definida pelo usuario", created_at: now });
    return Response.json({ ok: true });
  }

  if (action === "createChatMessage") {
    const message = String(payload.message || "").trim();
    if (!message || message.length > 1500) return Response.json({ error: "Escreva uma mensagem de ate 1.500 caracteres." }, { status: 400 });
    const messageId = id("MSG");
    await db.collection("chat_messages").doc(messageId).set({ id: messageId, user_id: actor.id, message, created_at: now });
    return Response.json({ ok: true });
  }

  if (action === "createAnnouncement") {
    if (!isManager(actor.role)) return Response.json({ error: "Somente administradores e gerentes podem publicar avisos." }, { status: 403 });
    const title = String(payload.title || "").trim();
    const message = String(payload.message || "").trim();
    if (!title || !message) return Response.json({ error: "Preencha o titulo e a mensagem do aviso." }, { status: 400 });
    const announcementId = id("ANN");
    await db.collection("announcements").doc(announcementId).set({ id: announcementId, user_id: actor.id, title, message, pinned: Boolean(payload.pinned), created_at: now });
    return Response.json({ ok: true });
  }

  if (action === "removeAnnouncement") {
    const announcementId = String(payload.announcementId || "");
    if (!announcementId) return Response.json({ error: "Aviso nao informado." }, { status: 400 });
    const ref = db.collection("announcements").doc(announcementId);
    const snap = await ref.get();
    const announcement = snap.data() as AnyRecord | undefined;
    if (!announcement || announcement.deleted_at) return Response.json({ error: "Aviso nao encontrado." }, { status: 404 });
    if (String(announcement.user_id) !== String(actor.id)) return Response.json({ error: "Somente quem publicou o aviso pode remove-lo." }, { status: 403 });
    await ref.update({ deleted_at: now, deleted_by: actor.id });
    const auditId = id("AUD");
    await db.collection("audit_logs").doc(auditId).set({ id: auditId, user_id: actor.id, action: "Remocao de aviso", material_id: null, changed_field: "Aviso", previous_value: announcement.title || "", new_value: "Removido", created_at: now });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acao invalida." }, { status: 400 });
}
