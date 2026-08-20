import { supabase } from "./supabase-client.js";
import { COACHING_STEPS } from "./coaching-progress.js";

const statusEl = document.getElementById("crm-status");
const appEl = document.getElementById("crm-app");
const searchEl = document.getElementById("crm-search");
const tbody = document.getElementById("crm-table-body");
const emptyEl = document.getElementById("crm-empty");
const resultCountEl = document.getElementById("crm-result-count");

const statTotal = document.getElementById("stat-total");
const statPastors = document.getElementById("stat-pastors");
const statDisciples = document.getElementById("stat-disciples");
const statStarted = document.getElementById("stat-started");

const detailName = document.getElementById("detail-name");
const detailHint = document.getElementById("detail-hint");
const detailFields = document.getElementById("detail-fields");
const detailStepsWrap = document.getElementById("detail-steps-wrap");
const detailSteps = document.getElementById("detail-steps");

let members = [];
let selectedId = null;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
  statusEl.classList.toggle("is-error", isError);
}

function roleLabel(role) {
  if (role === "pastor") return "Pastor";
  if (role === "disciple") return "Disciple";
  return "—";
}

function displayName(row) {
  return (
    row.full_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.email ||
    "Unknown"
  );
}

function stepLabel(row) {
  const total = COACHING_STEPS.length;
  if (!row.progress?.started && !(row.progress?.completed?.length > 0)) {
    return `— / ${total}`;
  }
  const step = row.progress?.current_step || 1;
  return `${step} / ${total}`;
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

function updateStats(rows) {
  if (statTotal) statTotal.textContent = String(rows.length);
  if (statPastors) {
    statPastors.textContent = String(rows.filter((r) => r.role === "pastor").length);
  }
  if (statDisciples) {
    statDisciples.textContent = String(rows.filter((r) => r.role === "disciple").length);
  }
  if (statStarted) {
    statStarted.textContent = String(
      rows.filter((r) => r.progress?.started || (r.progress?.completed?.length ?? 0) > 0).length
    );
  }
}

function filteredMembers() {
  const q = (searchEl?.value || "").trim().toLowerCase();
  if (!q) return members;
  return members.filter((row) => {
    const hay = [displayName(row), row.email, row.church, row.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function showDetail(row) {
  if (!row) {
    if (detailName) detailName.textContent = "Select a member";
    if (detailHint) {
      detailHint.hidden = false;
      detailHint.textContent = "Click a row to see contact fields and coaching steps.";
    }
    if (detailFields) detailFields.hidden = true;
    if (detailStepsWrap) detailStepsWrap.hidden = true;
    return;
  }

  selectedId = row.id;
  if (detailName) detailName.textContent = displayName(row);
  if (detailHint) detailHint.hidden = true;

  if (detailFields) {
    detailFields.hidden = false;
    detailFields.innerHTML = `
      <div><dt>Email</dt><dd>${row.email ? `<a href="mailto:${row.email}">${row.email}</a>` : "—"}</dd></div>
      <div><dt>Church</dt><dd>${row.church || "—"}</dd></div>
      <div><dt>Role</dt><dd>${roleLabel(row.role)}</dd></div>
      <div><dt>Joined</dt><dd>${formatDate(row.created_at)}</dd></div>
      <div><dt>Pathway</dt><dd>${stepLabel(row)}</dd></div>
    `;
  }

  const completed = new Set(row.progress?.completed || []);
  if (detailStepsWrap && detailSteps) {
    detailStepsWrap.hidden = false;
    detailSteps.innerHTML = COACHING_STEPS.map((step, index) => {
      const done = completed.has(step.id);
      return `<li class="${done ? "is-done" : ""}"><span>${String(index + 1).padStart(2, "0")}</span> ${step.title}${done ? " — done" : ""}</li>`;
    }).join("");
  }
}

function renderTable() {
  const rows = filteredMembers();
  if (resultCountEl) {
    resultCountEl.textContent =
      rows.length === members.length
        ? `${rows.length} member${rows.length === 1 ? "" : "s"}`
        : `${rows.length} of ${members.length} members`;
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
          <td>${displayName(row)}</td>
          <td>${row.email || "—"}</td>
          <td>${row.church || "—"}</td>
          <td>${roleLabel(row.role)}</td>
          <td>${stepLabel(row)}</td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    const open = () => {
      const row = members.find((m) => m.id === tr.getAttribute("data-id"));
      showDetail(row);
      renderTable();
    };
    tr.addEventListener("click", open);
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

async function loadMembers() {
  setStatus("Loading members…");

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

  updateStats(members);
  setStatus("");
  if (appEl) appEl.hidden = false;
  renderTable();
}

async function init() {
  try {
    await loadMembers();
    if (!members.length) {
      setStatus(
        "No member profiles yet. After you run supabase/SETUP_MEMBERS_CRM.sql in the Supabase SQL Editor, refresh this page — existing Auth users will appear here."
      );
    }
  } catch (err) {
    console.error(err);
    const code = err?.code || "";
    const missingTable = code === "PGRST205" || /Could not find the table/i.test(err?.message || "");
    setStatus(
      missingTable
        ? "Member tables are missing. In Supabase → SQL Editor, run supabase/SETUP_MEMBERS_CRM.sql, then refresh this page."
        : err?.message ||
            "Could not load members. Confirm SETUP_MEMBERS_CRM.sql has been run in Supabase.",
      true
    );
    if (appEl) appEl.hidden = true;
  }
}

searchEl?.addEventListener("input", () => {
  renderTable();
});

init();
