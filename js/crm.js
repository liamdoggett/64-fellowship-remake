import { supabase } from "./supabase-client.js";
import { COACHING_STEPS } from "./coaching-progress.js";

const statusEl = document.getElementById("crm-status");
const appEl = document.getElementById("crm-app");
const searchEl = document.getElementById("crm-search");
const sortEl = document.getElementById("crm-sort");
const tbody = document.getElementById("crm-table-body");
const emptyEl = document.getElementById("crm-empty");
const resultCountEl = document.getElementById("crm-result-count");
const pageMeta = document.getElementById("hs-page-meta");
const pageTitle = document.getElementById("hs-page-title");

const drawer = document.getElementById("crm-detail");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const detailName = document.getElementById("detail-name");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailAvatar = document.getElementById("detail-avatar");
const detailFields = document.getElementById("detail-fields");
const detailSteps = document.getElementById("detail-steps");
const detailActivity = document.getElementById("detail-activity");
const detailEmailBtn = document.getElementById("detail-email-btn");

let members = [];
let selectedId = null;
let activeView = "all";
let activeSection = "contacts";
let activeTab = "overview";

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.hidden = !message;
  statusEl.classList.toggle("is-error", isError);
}

function roleLabel(role) {
  if (role === "pastor") return "Pastor (6:4)";
  if (role === "disciple") return "Disciple (6:3)";
  return "Subscriber";
}

function displayName(row) {
  return (
    row.full_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.email ||
    "Unknown"
  );
}

function initials(row) {
  const name = displayName(row);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarHue(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * 17) % 360;
  return hash;
}

function currentStepNum(row) {
  if (!row.progress?.started && !(row.progress?.completed?.length > 0)) return 0;
  return row.progress?.current_step || 1;
}

function stepLabel(row) {
  const total = COACHING_STEPS.length;
  const step = currentStepNum(row);
  if (!step) return "Not started";
  const title = COACHING_STEPS[Math.min(step, total) - 1]?.title || `Step ${step}`;
  return `${step}/${total} · ${title}`;
}

function lifecycleBadge(role) {
  const label = roleLabel(role);
  const cls =
    role === "pastor" ? "is-pastor" : role === "disciple" ? "is-disciple" : "is-other";
  return `<span class="hs-badge ${cls}">${label}</span>`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function updateViewCounts() {
  const set = (id, n) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(n);
  };
  set("count-all", members.length);
  set("count-pastor", members.filter((r) => r.role === "pastor").length);
  set("count-disciple", members.filter((r) => r.role === "disciple").length);
  set(
    "count-started",
    members.filter((r) => r.progress?.started || (r.progress?.completed?.length ?? 0) > 0).length
  );
  set(
    "count-not-started",
    members.filter((r) => !r.progress?.started && !(r.progress?.completed?.length > 0)).length
  );
}

function filteredMembers() {
  const q = (searchEl?.value || "").trim().toLowerCase();
  let rows = [...members];

  if (activeView === "pastor") rows = rows.filter((r) => r.role === "pastor");
  if (activeView === "disciple") rows = rows.filter((r) => r.role === "disciple");
  if (activeView === "started") {
    rows = rows.filter((r) => r.progress?.started || (r.progress?.completed?.length ?? 0) > 0);
  }
  if (activeView === "not_started") {
    rows = rows.filter((r) => !r.progress?.started && !(r.progress?.completed?.length > 0));
  }

  if (q) {
    rows = rows.filter((row) => {
      const hay = [displayName(row), row.email, row.church, row.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = sortEl?.value || "created_desc";
  rows.sort((a, b) => {
    if (sort === "name_asc") return displayName(a).localeCompare(displayName(b));
    if (sort === "name_desc") return displayName(b).localeCompare(displayName(a));
    if (sort === "created_asc") return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    if (sort === "step_asc") return currentStepNum(a) - currentStepNum(b);
    if (sort === "step_desc") return currentStepNum(b) - currentStepNum(a);
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });

  return rows;
}

function openDrawer(row) {
  if (!drawer || !row) return;
  selectedId = row.id;
  document.body.classList.add("hs-drawer-open");
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  if (drawerBackdrop) drawerBackdrop.hidden = false;

  if (detailName) detailName.textContent = displayName(row);
  if (detailSubtitle) {
    detailSubtitle.textContent = [row.church, roleLabel(row.role)].filter(Boolean).join(" · ");
  }
  if (detailAvatar) {
    detailAvatar.textContent = initials(row);
    detailAvatar.style.setProperty("--hs-hue", String(avatarHue(row.id)));
  }
  if (detailEmailBtn) {
    if (row.email) {
      detailEmailBtn.href = `mailto:${row.email}`;
      detailEmailBtn.hidden = false;
    } else {
      detailEmailBtn.hidden = true;
    }
  }

  if (detailFields) {
    detailFields.innerHTML = [
      ["Email", row.email ? `<a href="mailto:${row.email}">${row.email}</a>` : "—"],
      ["Company (church)", row.church || "—"],
      ["Lifecycle stage", lifecycleBadge(row.role)],
      ["Coaching stage", stepLabel(row)],
      ["Create date", formatDate(row.created_at)],
      ["Last updated", formatDateTime(row.updated_at || row.progress?.updated_at)],
      ["Contact ID", `<code>${row.id.slice(0, 8)}…</code>`],
    ]
      .map(
        ([label, value]) => `
        <div class="hs-prop">
          <dt>${label}</dt>
          <dd>${value}</dd>
        </div>`
      )
      .join("");
  }

  const completed = new Set(row.progress?.completed || []);
  if (detailSteps) {
    detailSteps.innerHTML = COACHING_STEPS.map((step, index) => {
      const done = completed.has(step.id);
      const current = !done && index === Math.max(0, currentStepNum(row) - 1) && currentStepNum(row) > 0;
      return `
        <li class="${done ? "is-done" : ""} ${current ? "is-current" : ""}">
          <span class="hs-pathway__mark">${done ? "✓" : index + 1}</span>
          <div>
            <strong>${step.title}</strong>
            <p>${step.description}</p>
          </div>
        </li>`;
    }).join("");
  }

  if (detailActivity) {
    const events = [];
    events.push({
      when: row.created_at,
      title: "Contact created",
      detail: `${displayName(row)} joined the fellowship directory.`,
    });
    (row.progress?.completed || []).forEach((id) => {
      const step = COACHING_STEPS.find((s) => s.id === id);
      events.push({
        when: row.progress?.updated_at || row.updated_at,
        title: "Coaching step completed",
        detail: step?.title || id,
      });
    });
    if (row.progress?.started && !(row.progress?.completed?.length > 0)) {
      events.push({
        when: row.progress?.updated_at,
        title: "Coaching pathway started",
        detail: "Member began step 1 of 7.",
      });
    }
    events.sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
    detailActivity.innerHTML = events
      .map(
        (e) => `
        <li>
          <div class="hs-activity__dot" aria-hidden="true"></div>
          <div>
            <strong>${e.title}</strong>
            <p>${e.detail}</p>
            <time>${formatDateTime(e.when)}</time>
          </div>
        </li>`
      )
      .join("");
  }

  setTab(activeTab);
  renderTable();
}

function closeDrawer() {
  selectedId = null;
  document.body.classList.remove("hs-drawer-open");
  drawer?.classList.remove("is-open");
  drawer?.setAttribute("aria-hidden", "true");
  if (drawerBackdrop) drawerBackdrop.hidden = true;
  renderTable();
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".hs-tab").forEach((btn) => {
    const on = btn.getAttribute("data-tab") === tab;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.hidden = panel.getAttribute("data-tab-panel") !== tab;
  });
}

function renderTable() {
  const rows = filteredMembers();
  if (resultCountEl) {
    resultCountEl.textContent = `${rows.length.toLocaleString()} contact${rows.length === 1 ? "" : "s"}`;
  }
  if (pageMeta && activeSection === "contacts") {
    pageMeta.textContent = `${rows.length.toLocaleString()} records · view: ${activeView.replace("_", " ")}`;
  }

  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  tbody.innerHTML = rows
    .map((row) => {
      const active = row.id === selectedId ? "is-selected" : "";
      return `
        <tr class="${active}" data-id="${row.id}" tabindex="0">
          <td class="hs-col-check"><input type="checkbox" aria-label="Select ${displayName(row)}" /></td>
          <td>
            <div class="hs-name-cell">
              <span class="hs-avatar" style="--hs-hue:${avatarHue(row.id)}" aria-hidden="true">${initials(row)}</span>
              <button type="button" class="hs-linkish" data-open="${row.id}">${displayName(row)}</button>
            </div>
          </td>
          <td>${row.email || "—"}</td>
          <td>${row.church || "—"}</td>
          <td>${lifecycleBadge(row.role)}</td>
          <td><span class="hs-stage">${stepLabel(row)}</span></td>
          <td>${formatDate(row.created_at)}</td>
        </tr>`;
    })
    .join("");

  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    const open = () => {
      const row = members.find((m) => m.id === tr.getAttribute("data-id"));
      openDrawer(row);
    };
    tr.addEventListener("click", (e) => {
      if (e.target.closest("input[type=checkbox]")) return;
      open();
    });
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function renderCompanies() {
  const map = new Map();
  members.forEach((m) => {
    const key = (m.church || "Unassigned church").trim();
    if (!map.has(key)) map.set(key, { name: key, total: 0, pastors: 0, disciples: 0 });
    const row = map.get(key);
    row.total += 1;
    if (m.role === "pastor") row.pastors += 1;
    if (m.role === "disciple") row.disciples += 1;
  });
  const rows = [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const body = document.getElementById("companies-body");
  const count = document.getElementById("companies-count");
  if (count) count.textContent = `${rows.length} companies`;
  if (pageMeta) pageMeta.textContent = `${rows.length} churches / organizations`;
  if (!body) return;
  body.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.total}</td>
        <td>${r.pastors}</td>
        <td>${r.disciples}</td>
      </tr>`
    )
    .join("");
}

function renderPipeline() {
  const board = document.getElementById("pipeline-board");
  if (!board) return;
  if (pageMeta) pageMeta.textContent = "Contacts by coaching stage";

  const buckets = [
    { id: "not_started", title: "Not started", match: (r) => currentStepNum(r) === 0 },
    ...COACHING_STEPS.map((step, index) => ({
      id: step.id,
      title: `${index + 1}. ${step.title}`,
      match: (r) =>
        currentStepNum(r) === index + 1 &&
        (r.progress?.completed?.length || 0) < COACHING_STEPS.length,
    })),
    {
      id: "complete",
      title: "Completed",
      match: (r) => (r.progress?.completed?.length || 0) >= COACHING_STEPS.length,
    },
  ];

  board.innerHTML = buckets
    .map((bucket) => {
      const cards = members.filter(bucket.match);
      return `
        <div class="hs-pipe-col">
          <header>
            <h3>${bucket.title}</h3>
            <span>${cards.length}</span>
          </header>
          <ul>
            ${cards
              .slice(0, 40)
              .map(
                (row) => `
              <li>
                <button type="button" data-open="${row.id}">
                  <span class="hs-avatar" style="--hs-hue:${avatarHue(row.id)}" aria-hidden="true">${initials(row)}</span>
                  <span>
                    <strong>${displayName(row)}</strong>
                    <small>${row.church || "No church"} · ${roleLabel(row.role)}</small>
                  </span>
                </button>
              </li>`
              )
              .join("")}
            ${cards.length > 40 ? `<li class="hs-pipe-more">+${cards.length - 40} more</li>` : ""}
          </ul>
        </div>`;
    })
    .join("");

  board.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = members.find((m) => m.id === btn.getAttribute("data-open"));
      openDrawer(row);
    });
  });
}

function setSection(section) {
  activeSection = section;
  document.querySelectorAll(".hs-nav-item[data-section]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-section") === section);
  });
  document.querySelectorAll("[data-section-panel]").forEach((panel) => {
    panel.hidden = panel.getAttribute("data-section-panel") !== section;
  });
  if (pageTitle) {
    pageTitle.textContent =
      section === "companies" ? "Companies" : section === "pipeline" ? "Coaching pipeline" : "Contacts";
  }
  if (section === "contacts") renderTable();
  if (section === "companies") renderCompanies();
  if (section === "pipeline") renderPipeline();
}

function renderAll() {
  updateViewCounts();
  if (activeSection === "contacts") renderTable();
  if (activeSection === "companies") renderCompanies();
  if (activeSection === "pipeline") renderPipeline();
}

async function loadMembers() {
  setStatus("Loading contacts…");

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, full_name, church, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (profileError) throw profileError;

  const { data: progressRows, error: progressError } = await supabase
    .from("coaching_progress")
    .select("user_id, started, completed, current_step, updated_at");

  if (progressError) throw progressError;

  const progressByUser = new Map((progressRows || []).map((p) => [p.user_id, p]));

  members = (profiles || []).map((profile) => ({
    ...profile,
    progress: progressByUser.get(profile.id) || null,
  }));

  setStatus("");
  if (appEl) appEl.hidden = false;
  renderAll();
}

async function init() {
  try {
    await loadMembers();
    if (!members.length) {
      setStatus(
        "No contacts yet. Run supabase/SETUP_MEMBERS_CRM.sql (and optionally SEED_FAKE_MEMBERS.sql), then refresh."
      );
    }
  } catch (err) {
    console.error(err);
    const code = err?.code || "";
    const missingTable = code === "PGRST205" || /Could not find the table/i.test(err?.message || "");
    setStatus(
      missingTable
        ? "Member tables are missing. In Supabase → SQL Editor, run supabase/SETUP_MEMBERS_CRM.sql, then refresh this page."
        : err?.message || "Could not load contacts.",
      true
    );
    if (appEl) appEl.hidden = true;
  }
}

searchEl?.addEventListener("input", () => renderAll());
sortEl?.addEventListener("change", () => renderTable());

document.querySelectorAll(".hs-view").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeView = btn.getAttribute("data-view") || "all";
    document.querySelectorAll(".hs-view").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderTable();
  });
});

document.querySelectorAll(".hs-nav-item[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => setSection(btn.getAttribute("data-section")));
});

document.querySelectorAll(".hs-tab").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.getAttribute("data-tab")));
});

document.getElementById("drawer-close")?.addEventListener("click", closeDrawer);
drawerBackdrop?.addEventListener("click", closeDrawer);
document.getElementById("hs-refresh")?.addEventListener("click", () => init());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

init();
