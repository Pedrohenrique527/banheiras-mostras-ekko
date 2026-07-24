"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Gerente" | "Usuário";
  active?: number;
  created_at?: string;
};

type Material = {
  id: string;
  name: string;
  code: string;
  photo_url?: string | null;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  dimensions?: string;
  description?: string;
  source_ref?: string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_link?: string | null;
  invoice_note?: string | null;
  status: string;
  current_location: string;
  registered_by: string;
  last_changed_by: string;
  entry_date: string;
  last_movement_at: string;
  created_at: string;
  updated_at: string;
  removed_by?: string;
  removal_reason?: string;
  removal_location?: string;
  removed_at?: string;
};

type ChatMessage = { id: string; user_id: string; user_name: string; message: string; created_at: string };
type Announcement = { id: string; user_id: string; user_name: string; title: string; message: string; pinned: number; created_at: string };

type Movement = {
  id: string;
  material_id: string;
  material_name: string;
  material_code: string;
  user_id: string;
  user_name: string;
  previous_location: string;
  new_location: string;
  note?: string;
  moved_at: string;
};

type AuditLog = {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  material_id?: string;
  material_name?: string;
  material_code?: string;
  changed_field?: string;
  previous_value?: string;
  new_value?: string;
  created_at: string;
};

type Location = { id: string; name: string; type: string };
type NavKey = "overview" | "materials" | "history" | "chat" | "users" | "about";
type SystemData = {
  materials: Material[];
  movements: Movement[];
  auditLogs: AuditLog[];
  users: User[];
  locations: Location[];
  removedMaterials: Material[];
  messages: ChatMessage[];
  announcements: Announcement[];
};

const emptyData: SystemData = { materials: [], movements: [], auditLogs: [], users: [], locations: [], removedMaterials: [], messages: [], announcements: [] };
const navItems: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: "overview", label: "Resumo", icon: "⌂" },
  { key: "materials", label: "Banheiras e amostras", icon: "□" },
  { key: "history", label: "Histórico", icon: "↔" },
  { key: "chat", label: "Chat da equipe", icon: "☏" },
  { key: "users", label: "Usuários", icon: "◎" },
  { key: "about", label: "Sobre", icon: "i" },
];
const titles: Record<NavKey, string> = {
  overview: "Resumo da operação",
  materials: "Banheiras e amostras",
  history: "Movimentações e alterações",
  chat: "Chat da equipe",
  users: "Usuários",
  about: "Sobre o sistema",
};

function formatDate(value?: string, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function Photo({ material, className = "" }: { material: Material; className?: string }) {
  return (
    <div className={`product-photo ${className}`}>
      {material.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={material.photo_url} alt={material.name} />
      ) : (
        <div className="photo-missing"><span>Sem foto</span><small>Adicione uma imagem</small></div>
      )}
    </div>
  );
}

function Status({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("disponível") ? "available"
    : normalized.includes("exposição") ? "show"
      : normalized.includes("manutenção") || normalized.includes("urgente") ? "warning"
        : normalized.includes("não localizado") ? "danger"
          : normalized.includes("cliente") ? "client" : "neutral";
  return <span className={`status ${tone}`}><i />{value}</span>;
}

function AnnouncementBar({ announcement }: { announcement?: Announcement }) {
  if (!announcement) return null;
  return (
    <section className="announcement-bar">
      <span className="announcement-mark">!</span>
      <div><small>AVISO PARA TODA A EQUIPE</small><strong>{announcement.title}</strong><p>{announcement.message}</p></div>
      <span className="announcement-by">{announcement.user_name}<br />{formatDate(announcement.created_at, true)}</span>
    </section>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => Promise<void> }) {
  const [email, setEmail] = useState("admin@ekko.com.br");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as User & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      await onLogin(result);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-identity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pedro-logo" src="/pedro-mariniello-transparent.png" alt="Pedro Mariniello" />
        <div className="login-title">
          <span>GESTÃO E RASTREABILIDADE</span>
          <h1>Sistema de<br />Banheiras e Amostras</h1>
          <p>Uma visão simples de cada produto, onde ele está e quem fez a última movimentação.</p>
        </div>
        <div className="route-animation" aria-hidden="true">
          <div><b>01</b><span>Cadastro</span></div>
          <i />
          <div><b>02</b><span>Localização</span></div>
          <i />
          <div><b>03</b><span>Histórico</span></div>
          <em />
        </div>
        <div className="login-company">
          <span>Sistema exclusivo para</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ekko-revestimentos.png" alt="Ekko Revestimentos Especiais" />
        </div>
      </section>
      <section className="login-access">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-identity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pedro-mariniello-transparent.png" alt="Pedro Mariniello" />
            <strong>Sistema de Banheiras e Amostras</strong>
          </div>
          <span className="kicker">ACESSO AO SISTEMA</span>
          <h2>Bem-vindo</h2>
          <p>Use suas credenciais para acessar o controle da Ekko.</p>
          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Digite sua senha" required /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="button primary wide" disabled={loading}>{loading ? "Entrando..." : "Entrar"}<span>→</span></button>
          <div className="first-access"><span>Primeiro acesso</span><strong>admin@ekko.com.br</strong><small>Senha: Ekko@2026</small></div>
        </form>
        <footer>Software desenvolvido por Pedro Mariniello</footer>
      </section>
    </main>
  );
}

function Overview({ data, onOpen, onMove, onShowAll }: {
  data: SystemData;
  onOpen: (material: Material) => void;
  onMove: (material: Material) => void;
  onShowAll: () => void;
}) {
  const atCd = data.materials.filter((item) => item.current_location === "CD Irajá").length;
  const atShows = data.materials.filter((item) => item.status === "Em exposição").length;
  const attention = data.materials.filter((item) => ["Não localizado", "Em manutenção", "Entrega urgente"].includes(item.status));

  return (
    <div className="overview">
      <section className="welcome-strip">
        <div>
          <span className="kicker inverse">CONTROLE CENTRAL</span>
          <h2>Todos os produtos, sem perder o fio.</h2>
          <p>Cadastro simples, com os campos organizados a partir da planilha BANHEIRAS E MOSTRAS.</p>
        </div>
        <button className="button light" onClick={onShowAll}>Ver todos os produtos <span>→</span></button>
      </section>

      <section className="summary-row">
        {[
          ["Produtos cadastrados", data.materials.length, "base atual"],
          ["No CD Irajá", atCd, "disponíveis ou aguardando"],
          ["Em mostras e lojas", atShows, "em exposição"],
          ["Precisam de atenção", attention.length, "pendências"],
        ].map(([label, value, detail]) => (
          <article className="summary-item" key={String(label)}>
            <span>{label}</span><strong>{String(value).padStart(2, "0")}</strong><small>{detail}</small>
          </article>
        ))}
      </section>

      <div className="overview-columns">
        <section className="surface recent-products">
          <header><div><span className="kicker">IDENTIFICAÇÃO VISUAL</span><h3>Produtos</h3></div><button className="link-button" onClick={onShowAll}>Abrir estoque</button></header>
          {data.materials.length > 0 ? <div className="compact-product-grid">
            {data.materials.slice(0, 6).map((material) => (
              <button className="compact-product" key={material.id} onClick={() => onOpen(material)}>
                <Photo material={material} />
                <span><small>{material.code}</small><strong>{material.name}</strong><em>{material.current_location}</em></span>
              </button>
            ))}
          </div> : <div className="dashboard-empty"><span>□</span><strong>Nenhum produto cadastrado</strong><p>Use “Novo produto” para incluir a primeira banheira ou amostra com foto.</p></div>}
        </section>

        <section className="surface attention">
          <header><div><span className="kicker">ACOMPANHAMENTO</span><h3>Requer atenção</h3></div><span className="number-pill">{attention.length}</span></header>
          <div className="attention-list">
            {attention.map((material) => (
              <div className="attention-item" key={material.id}>
                <Photo material={material} />
                <div><strong>{material.name}</strong><small>{material.current_location}</small><Status value={material.status} /></div>
                <button onClick={() => onMove(material)}>Movimentar</button>
              </div>
            ))}
          </div>
        <div className="pending-note"><b>+</b><span><strong>Cadastre com a foto do produto</strong><small>A imagem fica visível no estoque e na ficha de rastreabilidade.</small></span></div>
        </section>
      </div>

      <section className="surface movement-preview">
        <header><div><span className="kicker">RASTREABILIDADE</span><h3>Últimas movimentações</h3></div></header>
        {data.movements.length > 0 ? <div className="movement-list">
          {data.movements.slice(0, 5).map((movement) => (
            <button key={movement.id} onClick={() => {
              const material = data.materials.find((item) => item.id === movement.material_id);
              if (material) onOpen(material);
            }}>
              <span className="movement-avatar">{initials(movement.user_name)}</span>
              <span><strong>{movement.material_name}</strong><small>{movement.user_name}</small></span>
              <span className="movement-route"><em>{movement.previous_location}</em><b>→</b><strong>{movement.new_location}</strong></span>
              <time>{formatDate(movement.moved_at, true)}</time>
            </button>
          ))}
        </div> : <div className="dashboard-empty small"><span>↔</span><strong>Ainda não há movimentações</strong><p>O histórico será criado automaticamente quando os produtos forem movimentados.</p></div>}
      </section>
    </div>
  );
}

function Materials({ data, onNew, onOpen, onMove }: {
  data: SystemData;
  onNew: () => void;
  onOpen: (material: Material) => void;
  onMove: (material: Material) => void;
}) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    return data.materials.filter((material) =>
      (!term || `${material.name} ${material.code} ${material.brand} ${material.model}`.toLowerCase().includes(term))
      && (location === "Todos" || material.current_location === location)
      && (status === "Todos" || material.status === status));
  }, [data.materials, query, location, status]);
  const statuses = [...new Set(data.materials.map((item) => item.status))];

  return (
    <section className="materials-page">
      <div className="materials-actions">
        <div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, código ou marca" /></div>
        <select value={location} onChange={(event) => setLocation(event.target.value)}><option>Todos</option>{data.locations.map((item) => <option key={item.id}>{item.name}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="button primary" onClick={onNew}>+ Cadastrar produto</button>
      </div>
      <div className="results-line"><strong>{filtered.length}</strong> produtos encontrados <span>•</span> Visualização com fotos</div>
      <div className="product-grid">
        {filtered.map((material) => (
          <article className="product-card" key={material.id}>
            <button className="product-image-button" onClick={() => onOpen(material)}><Photo material={material} /></button>
            <div className="product-card-body">
              <div className="product-meta"><span>{material.code}</span><Status value={material.status} /></div>
              <button className="product-name" onClick={() => onOpen(material)}>{material.name}</button>
              <p>{material.brand}{material.model ? ` · ${material.model}` : ""}</p>
              <dl><div><dt>Local atual</dt><dd>{material.current_location}</dd></div><div><dt>Última alteração</dt><dd>{formatDate(material.updated_at)}</dd></div></dl>
              {material.source_ref && <small className="source-line">{material.source_ref}</small>}
            </div>
            <footer><button onClick={() => onOpen(material)}>Ver ficha</button><button className="move-button" onClick={() => onMove(material)}>Movimentar →</button></footer>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-state"><strong>Nenhum produto encontrado</strong><p>Altere os filtros ou cadastre um novo produto.</p></div>}
    </section>
  );
}

function History({ data, onOpen }: { data: SystemData; onOpen: (material: Material) => void }) {
  const [tab, setTab] = useState<"movements" | "audit" | "removed">("movements");
  return (
    <section className="surface history-page">
      <header className="history-header">
        <div className="tabs"><button className={tab === "movements" ? "active" : ""} onClick={() => setTab("movements")}>Movimentações</button><button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Alterações</button><button className={tab === "removed" ? "active" : ""} onClick={() => setTab("removed")}>Removidos ({data.removedMaterials.length})</button></div>
        <span>Registros permanentes</span>
      </header>
      {tab === "movements" ? (
        <div className="history-table">
          <div className="table-head"><span>Produto</span><span>Trajeto</span><span>Responsável</span><span>Data</span></div>
          {data.movements.map((movement) => (
            <button className="table-row" key={movement.id} onClick={() => {
              const material = data.materials.find((item) => item.id === movement.material_id);
              if (material) onOpen(material);
            }}>
              <span><strong>{movement.material_name}</strong><small>{movement.material_code}</small></span>
              <span><em>{movement.previous_location}</em><b>→</b><strong>{movement.new_location}</strong></span>
              <span>{movement.user_name}</span><time>{formatDate(movement.moved_at, true)}</time>
            </button>
          ))}
        </div>
      ) : tab === "audit" ? (
        <div className="history-table audit-table">
          <div className="table-head"><span>Ação</span><span>Produto / campo</span><span>Alteração</span><span>Responsável / data</span></div>
          {data.auditLogs.map((log) => (
            <div className="table-row" key={log.id}>
              <span><strong>{log.action}</strong></span>
              <span><strong>{log.material_name || "Sistema"}</strong><small>{log.changed_field || "—"}</small></span>
              <span><em>{log.previous_value || "—"}</em><b>→</b><strong>{log.new_value || "—"}</strong></span>
              <span>{log.user_name}<small>{formatDate(log.created_at, true)}</small></span>
            </div>
          ))}
        </div>
      ) : (
        <div className="history-table audit-table"><div className="table-head"><span>Produto removido</span><span>Onde</span><span>Motivo</span><span>Quem / quando</span></div>{data.removedMaterials.length === 0 ? <div className="history-empty">Nenhum produto foi removido.</div> : data.removedMaterials.map((material) => <div className="table-row" key={material.id}><span><strong>{material.name}</strong><small>{material.code}</small></span><span><strong>{material.removal_location || "—"}</strong></span><span><strong>{material.removal_reason || "—"}</strong></span><span>{material.removed_by || "—"}<small>{formatDate(material.removed_at, true)}</small></span></div>)}</div>
      )}
    </section>
  );
}

function TeamChat({ data, user, onSaved }: { data: SystemData; user: User; onSaved: (message?: string) => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const canAnnounce = user.role === "Administrador" || user.role === "Gerente";

  async function post(action: "createChatMessage" | "createAnnouncement") {
    setPublishing(true);
    setError("");
    try {
      const body = action === "createChatMessage"
        ? { action, userId: user.id, message }
        : { action, userId: user.id, title, message: notice, pinned: true };
      const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
      if (action === "createChatMessage") setMessage(""); else { setTitle(""); setNotice(""); }
      await onSaved(action === "createChatMessage" ? "Mensagem enviada." : "Aviso publicado para toda a equipe.");
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Não foi possível enviar.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="chat-layout">
      <div className="surface chat-panel">
        <header><div><span className="kicker">COMUNICAÇÃO INTERNA</span><h3>Conversa da equipe</h3></div><span className="chat-count">{data.messages.length} mensagens</span></header>
        <div className="chat-stream">
          {data.messages.length === 0 && <div className="chat-empty"><span>☏</span><strong>Comece a conversa</strong><p>As mensagens enviadas aqui ficam disponíveis para toda a equipe.</p></div>}
          {data.messages.map((item) => <article className={`chat-message ${item.user_id === user.id ? "mine" : ""}`} key={item.id}><span className="message-avatar">{initials(item.user_name)}</span><div><header><strong>{item.user_name}</strong><time>{formatDate(item.created_at, true)}</time></header><p>{item.message}</p></div></article>)}
        </div>
        <div className="chat-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1500} placeholder="Escreva uma mensagem para a equipe..." rows={3} /><button className="button primary" disabled={publishing || !message.trim()} onClick={() => post("createChatMessage")}>{publishing ? "Enviando..." : "Enviar mensagem"}</button></div>
        {error && <div className="form-error chat-error">{error}</div>}
      </div>
      <aside className="chat-sidebar">
        <section className="surface notice-list"><header><div><span className="kicker">MURAL</span><h3>Avisos gerais</h3></div></header>{data.announcements.length === 0 ? <p className="notice-empty">Nenhum aviso publicado.</p> : data.announcements.map((item) => <article key={item.id}><span>AVISO</span><strong>{item.title}</strong><p>{item.message}</p><small>{item.user_name} · {formatDate(item.created_at, true)}</small></article>)}</section>
        {canAnnounce && <section className="surface announcement-compose"><span className="kicker">PUBLICAR PARA TODOS</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título do aviso" /><textarea value={notice} onChange={(event) => setNotice(event.target.value)} placeholder="Mensagem que todos verão ao entrar" rows={4} /><button className="button secondary wide" disabled={publishing || !title.trim() || !notice.trim()} onClick={() => post("createAnnouncement")}>Publicar aviso <span>→</span></button></section>}
      </aside>
    </section>
  );
}

function Users({ data, user, onNew }: { data: SystemData; user: User; onNew: () => void }) {
  const isAdmin = user.role === "Administrador";
  return (
    <section className="surface users-page">
      <header><div><span className="kicker">CONTROLE DE ACESSO</span><h3>Equipe cadastrada</h3><p className="users-help">Você tem {data.users.length} acesso(s) criado(s). Para criar os 5 acessos, use “Novo usuário” até completar a equipe.</p></div>{isAdmin && <button className="button primary" onClick={onNew}>+ Novo usuário</button>}</header>
      {!isAdmin && <div className="permission-note">A criação de logins e senhas é feita somente pelo administrador.</div>}
      <div className="user-list">
        {data.users.map((user) => (
          <div className="user-row" key={user.id}><span className="user-avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><span className="role">{user.role}</span><span className="active-user"><i />Ativo</span></div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="about-page">
      <div className="about-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="about-ekko" src="/ekko-revestimentos.png" alt="Ekko Revestimentos Especiais" />
        <span className="kicker">SISTEMA CORPORATIVO</span>
        <h2>Sistema de Banheiras e Amostras</h2>
        <p>Gestão visual e rastreabilidade de produtos, mostras, lojas e empréstimos da Ekko Revestimentos.</p>
        <dl><div><dt>Versão</dt><dd>2.0.0</dd></div><div><dt>Estrutura baseada em</dt><dd>BANHEIRAS E MOSTRAS.xlsx</dd></div></dl>
        <div className="about-signature"><span>Software desenvolvido por</span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/pedro-mariniello-transparent.png" alt="Pedro Mariniello" /></div>
      </div>
    </section>
  );
}

function Modal({ title, subtitle, onClose, children, large = false }: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${large ? "large" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><span className="kicker">{subtitle}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Fechar">×</button></header>
        {children}
      </section>
    </div>
  );
}

function NewMaterial({ data, user, onClose, onSaved }: {
  data: SystemData;
  user: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await response.json() as { url?: string; name?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Falha no envio.");
      setPhotoUrl(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha no envio.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photoUrl) {
      setError("A foto é obrigatória. Ela ajuda a equipe a identificar o produto.");
      return;
    }
    setSaving(true);
    setError("");
    const material = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createMaterial", userId: user.id, material: { ...material, photo_url: photoUrl } }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível cadastrar.");
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Cadastrar produto" subtitle="NOVO REGISTRO" onClose={onClose} large>
      <form className="material-form" onSubmit={submit}>
        <section className="photo-step">
          <div><span className="step-number">1</span><div><strong>Foto do produto</strong><p>Obrigatória para facilitar a identificação pela equipe.</p></div></div>
          <label className={`upload-area ${photoUrl ? "has-image" : ""}`}>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Prévia do produto" />
            ) : <span><b>{uploading ? "Enviando imagem..." : "+ Selecionar foto"}</b><small>JPG, PNG ou WEBP · até 5 MB</small></span>}
          </label>
        </section>
        <section className="form-step">
          <div className="step-title"><span className="step-number">2</span><div><strong>Informações do produto</strong><p>Campos baseados na planilha atual.</p></div></div>
          <div className="form-fields">
            <label className="span-2">Nome do produto<input name="name" required placeholder="Ex.: Banheira Soho 170 Texture White" /></label>
            <label>Código<input name="code" required placeholder="Ex.: DK5106WH" /></label>
            <label>Categoria<select name="category" defaultValue="Banheira"><option>Banheira</option><option>Amostra</option><option>Material de exposição</option><option>Outro</option></select></label>
            <label>Marca<input name="brand" placeholder="Ex.: Doka" /></label>
            <label>Modelo<input name="model" placeholder="Ex.: Soho 170" /></label>
            <label>Cor / acabamento<input name="color" placeholder="Ex.: Texture White" /></label>
            <label>Dimensões<input name="dimensions" placeholder="Opcional" /></label>
            <label>Local atual<select name="current_location" defaultValue="CD Irajá">{data.locations.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
            <label>Status<select name="status" defaultValue="Disponível"><option>Disponível</option><option>Em exposição</option><option>Em cliente</option><option>Em manutenção</option><option>Entrega urgente</option><option>Não localizado</option><option>Retirado</option></select></label>
            <label className="span-2">Pedido, mostra ou referência<input name="source_ref" placeholder="Ex.: Pedido 7231.2026 — Tiago Castello Banco" /></label>
            <label>Data de entrada<input name="entry_date" type="date" defaultValue="2026-07-23" /></label>
            <label>Número da nota fiscal<input name="invoice_number" placeholder="Ex.: NF 12876" /></label>
            <label>Data da nota fiscal<input name="invoice_date" type="date" /></label>
            <label className="span-2">Link da nota fiscal<input name="invoice_link" type="url" placeholder="Cole aqui um link, se existir" /></label>
            <label className="span-2">Observação da nota fiscal<textarea name="invoice_note" rows={2} placeholder="Ex.: nota enviada pelo fornecedor, aguardando XML, sem nota no momento." /></label>
            <label className="span-2">Observações<textarea name="description" rows={3} placeholder="Estado do produto, prazo da mostra ou informação importante." /></label>
          </div>
        </section>
        {error && <div className="form-error">{error}</div>}
        <footer className="form-footer"><span>Cadastro por <strong>{user.name}</strong></span><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving || uploading}>{saving ? "Salvando..." : "Cadastrar produto"}</button></footer>
      </form>
    </Modal>
  );
}

function EditMaterial({ material, user, onClose, onSaved }: { material: Material; user: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const [photoUrl, setPhotoUrl] = useState(material.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setError("");
    const form = new FormData(); form.append("file", file);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await response.json() as { url?: string; name?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Falha no envio.");
      setPhotoUrl(result.url);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Falha no envio."); } finally { setUploading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateMaterial", userId: user.id, materialId: material.id, material: { ...values, photo_url: photoUrl } }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar as alterações.");
      await onSaved(); onClose();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as alterações."); } finally { setSaving(false); }
  }
  return (
    <Modal title="Editar produto" subtitle="ALTERAÇÕES AUDITADAS" onClose={onClose} large>
      <form className="material-form edit-material-form" onSubmit={submit}>
        <section className="photo-step"><div><span className="step-number">1</span><div><strong>Foto do produto</strong><p>Troque a foto quando necessário.</p></div></div><label className="upload-area has-image"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} />{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photoUrl} alt="Prévia atual" /></label></section>
        <section className="form-step"><div className="step-title"><span className="step-number">2</span><div><strong>Dados cadastrados</strong><p>Localização deve ser alterada pelo botão de movimentação.</p></div></div><div className="form-fields">
          <label className="span-2">Nome do produto<input name="name" defaultValue={material.name} required /></label>
          <label>Código<input name="code" defaultValue={material.code} required /></label>
          <label>Categoria<select name="category" defaultValue={material.category}><option>Banheira</option><option>Amostra</option><option>Material de exposição</option><option>Outro</option></select></label>
          <label>Marca<input name="brand" defaultValue={material.brand || ""} /></label><label>Modelo<input name="model" defaultValue={material.model || ""} /></label>
          <label>Cor / acabamento<input name="color" defaultValue={material.color || ""} /></label><label>Dimensões<input name="dimensions" defaultValue={material.dimensions || ""} /></label>
          <label className="span-2">Pedido, mostra ou referência<input name="source_ref" defaultValue={material.source_ref || ""} /></label>
          <label>Data de entrada<input name="entry_date" type="date" defaultValue={material.entry_date} /></label>
          <label>Número da nota fiscal<input name="invoice_number" defaultValue={material.invoice_number || ""} /></label>
          <label>Data da nota fiscal<input name="invoice_date" type="date" defaultValue={material.invoice_date || ""} /></label>
          <label className="span-2">Link da nota fiscal<input name="invoice_link" type="url" defaultValue={material.invoice_link || ""} /></label>
          <label className="span-2">Observação da nota fiscal<textarea name="invoice_note" rows={2} defaultValue={material.invoice_note || ""} /></label>
          <label className="span-2">Observações<textarea name="description" rows={3} defaultValue={material.description || ""} /></label>
        </div></section>
        {error && <div className="form-error">{error}</div>}
        <footer className="form-footer"><span>Todas as alterações ficam salvas no histórico.</span><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving || uploading}>{saving ? "Salvando..." : "Salvar alterações"}</button></footer>
      </form>
    </Modal>
  );
}

function RemoveMaterial({ material, user, onClose, onSaved }: { material: Material; user: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const [removalLocation, setRemovalLocation] = useState(material.current_location);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "removeMaterial", userId: user.id, materialId: material.id, removalLocation, reason }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível remover o produto.");
      await onSaved(); onClose();
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Não foi possível remover o produto."); } finally { setSaving(false); }
  }
  return <Modal title="Remover produto" subtitle="REGISTRO PERMANENTE" onClose={onClose}><form className="simple-form remove-form" onSubmit={submit}><div className="remove-warning"><strong>{material.name}</strong><p>O produto sai do estoque, mas permanece para sempre no histórico com todos os dados da retirada.</p></div><label>Onde o produto estava ao ser removido<input value={removalLocation} onChange={(event) => setRemovalLocation(event.target.value)} required /></label><label>Por que o produto foi removido<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} required placeholder="Ex.: avaria, descarte, venda, devolução..." /></label><div className="record-note"><strong>Será registrado</strong><p>Quem removeu: {user.name}<br />Quando: {formatDate(new Date().toISOString(), true)}<br />Onde e motivo informados acima.</p></div>{error && <div className="form-error">{error}</div>}<footer className="form-footer"><span /><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button danger" disabled={saving}>{saving ? "Removendo..." : "Confirmar remoção"}</button></footer></form></Modal>;
}

function MoveMaterial({ material, locations, user, onClose, onSaved }: {
  material: Material;
  locations: Location[];
  user: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [newLocation, setNewLocation] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "moveMaterial", materialId: material.id, newLocation, note, userId: user.id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível movimentar.");
      await onSaved();
      onClose();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Não foi possível movimentar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title="Movimentar produto" subtitle="NOVO DESTINO" onClose={onClose}>
      <form className="move-form" onSubmit={submit}>
        <div className="move-product"><Photo material={material} /><div><small>{material.code}</small><strong>{material.name}</strong><Status value={material.status} /></div></div>
        <div className="route-form"><div><span>LOCAL ATUAL</span><strong>{material.current_location}</strong></div><b>→</b><label>NOVO LOCAL<select required value={newLocation} onChange={(event) => setNewLocation(event.target.value)}><option value="">Selecione</option>{locations.filter((item) => item.name !== material.current_location).map((item) => <option key={item.id}>{item.name}</option>)}</select></label></div>
        <label>Observação<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Motivo ou informação importante sobre a movimentação." /></label>
        <div className="record-note"><strong>Registro permanente</strong><p>A movimentação ficará vinculada a {user.name} e não poderá ser apagada.</p></div>
        {error && <div className="form-error">{error}</div>}
        <footer className="form-footer"><span>{formatDate(new Date().toISOString(), true)}</span><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Registrando..." : "Confirmar movimentação"}</button></footer>
      </form>
    </Modal>
  );
}

function NewUser({ currentUser, onClose, onSaved }: { currentUser: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const user = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/system", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createUser", userId: currentUser.id, user }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível criar o usuário.");
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível criar o usuário.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title="Novo usuário" subtitle="CONTROLE DE ACESSO" onClose={onClose}>
      <form className="simple-form" onSubmit={submit}>
        <label>Nome completo<input name="name" required /></label><label>E-mail<input name="email" type="email" required /></label>
        <label>Perfil<select name="role"><option>Administrador</option><option>Gerente</option><option>Usuário</option></select></label>
        <label>Senha inicial<input name="password" type="password" minLength={8} required /></label>
        {error && <div className="form-error">{error}</div>}
        <footer className="form-footer"><span /><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Criando..." : "Criar usuário"}</button></footer>
      </form>
    </Modal>
  );
}

function Detail({ material, movements, user, onClose, onMove, onEdit, onRemove }: {
  material: Material;
  movements: Movement[];
  user: User;
  onClose: () => void;
  onMove: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const history = movements.filter((item) => item.material_id === material.id);
  const qrValue = typeof window === "undefined" ? "" : `${window.location.origin}/?material=${material.id}`;
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="detail-drawer">
        <header><span className="kicker">FICHA DO PRODUTO</span><button onClick={onClose}>×</button></header>
        <Photo material={material} className="detail-photo" />
        <div className="detail-heading"><span>{material.code}</span><h2>{material.name}</h2><p>{material.brand} · {material.model}</p><Status value={material.status} /></div>
        <div className="location-block"><span>LOCALIZAÇÃO ATUAL</span><strong>{material.current_location}</strong><small>Atualizado por {material.last_changed_by} em {formatDate(material.last_movement_at, true)}</small></div>
        <div className="detail-actions"><button className="button primary" onClick={onMove}>Movimentar <span>→</span></button><button className="button secondary" onClick={onEdit}>Editar produto</button></div>
        <dl className="detail-data"><div><dt>Categoria</dt><dd>{material.category}</dd></div><div><dt>Cor</dt><dd>{material.color || "—"}</dd></div><div><dt>Entrada</dt><dd>{formatDate(material.entry_date)}</dd></div><div><dt>Cadastrado por</dt><dd>{material.registered_by}</dd></div></dl>
        {material.source_ref && <div className="detail-note"><span>PEDIDO / REFERÊNCIA</span><p>{material.source_ref}</p></div>}
        {material.description && <div className="detail-note"><span>OBSERVAÇÕES</span><p>{material.description}</p></div>}
        {(material.invoice_number || material.invoice_date || material.invoice_link || material.invoice_note) && <div className="invoice-link invoice-card"><span>NF</span><div><small>NOTA FISCAL</small><strong>{material.invoice_number || "Sem número informado"}</strong>{material.invoice_date && <small>{formatDate(material.invoice_date)}</small>}{material.invoice_note && <p>{material.invoice_note}</p>}</div>{material.invoice_link && <a href={material.invoice_link} target="_blank" rel="noreferrer">Abrir link ↗</a>}</div>}
        <section className="timeline"><span className="kicker">HISTÓRICO</span><h3>Linha do tempo</h3>
          {history.map((movement) => (
            <div className="timeline-item" key={movement.id}><time>{formatDate(movement.moved_at, true)}</time><i /><div><strong>Movido para {movement.new_location}</strong><p>Origem: {movement.previous_location}</p><small>{movement.user_name}{movement.note ? ` · ${movement.note}` : ""}</small></div></div>
          ))}
        </section>
        <section className="qr-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrValue)}`} alt={`QR Code de ${material.name}`} />
          <div><span className="kicker">ACESSO RÁPIDO</span><h3>QR Code individual</h3><p>Use na etiqueta física para abrir esta ficha.</p><button className="button secondary" onClick={() => window.print()}>Imprimir etiqueta</button></div>
        </section>
        {(user.role === "Administrador" || user.role === "Gerente") && <button className="remove-product-button" onClick={onRemove}>Remover produto do estoque</button>}
      </aside>
    </div>
  );
}

export function EkkoApp() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<SystemData>(emptyData);
  const [nav, setNav] = useState<NavKey>("overview");
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newMaterial, setNewMaterial] = useState(false);
  const [newUser, setNewUser] = useState(false);
  const [moveMaterial, setMoveMaterial] = useState<Material | null>(null);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [removeMaterial, setRemoveMaterial] = useState<Material | null>(null);
  const [detailMaterial, setDetailMaterial] = useState<Material | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const current = await response.json() as User;
        if (!mounted) return;
        setUser(current);
      } catch {
        // Login manual continua disponivel quando nao houver sessao salva.
      }
    }
    restoreSession();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (user) void refreshData();
  }, [user]);

  async function refreshData(message?: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/system", { cache: "no-store" });
      const result = await response.json() as SystemData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Falha ao carregar os dados.");
      setData(result);
      const materialId = new URLSearchParams(window.location.search).get("material");
      if (materialId) {
        const selected = result.materials.find((item) => item.id === materialId);
        if (selected) setDetailMaterial(selected);
      }
      if (message) {
        setToast(message);
        window.setTimeout(() => setToast(""), 3200);
      }
    } catch {
      setToast("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  async function login(loggedUser: User) {
    setUser(loggedUser);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setData(emptyData);
  }

  if (!user) return <Login onLogin={login} />;

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="sidebar-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" />
          <div><strong>Sistema de Banheiras</strong><span>e Amostras</span></div>
        </div>
        <nav>
          <span className="nav-label">NAVEGAÇÃO</span>
          {navItems.map((item) => <button key={item.key} className={nav === item.key ? "active" : ""} onClick={() => { setNav(item.key); setMobileMenu(false); }}><i>{item.icon}</i><span>{item.label}</span>{item.key === "materials" && <b>{data.materials.length}</b>}</button>)}
        </nav>
        <div className="sidebar-company"><span>Operação</span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/ekko-revestimentos.png" alt="Ekko Revestimentos" /></div>
        <div className="sidebar-user"><span className="user-avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.role}</small></div><button onClick={logout} aria-label="Sair">↗</button></div>
        <footer>Desenvolvido por <strong>Pedro Mariniello</strong></footer>
      </aside>
      {mobileMenu && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
      <main className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}>☰</button>
          <div><span>EKkO REVESTIMENTOS</span><h1>{titles[nav]}</h1></div>
          <button className="quick-add" onClick={() => setNewMaterial(true)}>+ Novo produto</button>
          <span className="top-avatar">{initials(user.name)}</span>
        </header>
        <div className="page-content">
          <AnnouncementBar announcement={data.announcements[0]} />
          {loading && data.materials.length === 0 ? <div className="loading"><span /><strong>Organizando os produtos...</strong></div> : (
            <>
              {nav === "overview" && <Overview data={data} onOpen={setDetailMaterial} onMove={setMoveMaterial} onShowAll={() => setNav("materials")} />}
              {nav === "materials" && <Materials data={data} onNew={() => setNewMaterial(true)} onOpen={setDetailMaterial} onMove={setMoveMaterial} />}
              {nav === "history" && <History data={data} onOpen={setDetailMaterial} />}
              {nav === "chat" && <TeamChat data={data} user={user} onSaved={(message) => refreshData(message)} />}
              {nav === "users" && <Users data={data} user={user} onNew={() => setNewUser(true)} />}
              {nav === "about" && <About />}
            </>
          )}
        </div>
      </main>
      {newMaterial && <NewMaterial data={data} user={user} onClose={() => setNewMaterial(false)} onSaved={() => refreshData("Produto cadastrado com foto.")} />}
      {newUser && <NewUser currentUser={user} onClose={() => setNewUser(false)} onSaved={() => refreshData("Usuário criado com sucesso.")} />}
      {moveMaterial && <MoveMaterial material={moveMaterial} locations={data.locations} user={user} onClose={() => setMoveMaterial(null)} onSaved={() => refreshData("Movimentação registrada.")} />}
      {editMaterial && <EditMaterial material={data.materials.find((item) => item.id === editMaterial.id) || editMaterial} user={user} onClose={() => setEditMaterial(null)} onSaved={() => refreshData("Alterações salvas no histórico.")} />}
      {removeMaterial && <RemoveMaterial material={removeMaterial} user={user} onClose={() => setRemoveMaterial(null)} onSaved={() => refreshData("Produto removido e registrado no histórico.")} />}
      {detailMaterial && <Detail material={data.materials.find((item) => item.id === detailMaterial.id) || detailMaterial} movements={data.movements} user={user} onClose={() => setDetailMaterial(null)} onMove={() => { setMoveMaterial(detailMaterial); setDetailMaterial(null); }} onEdit={() => { setEditMaterial(detailMaterial); setDetailMaterial(null); }} onRemove={() => { setRemoveMaterial(detailMaterial); setDetailMaterial(null); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}
