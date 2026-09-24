/* ============================================================
   «Проекты» — логика приложения
   Чистый JS без зависимостей. Хранение: localStorage.
   ============================================================ */

"use strict";

/* ---------- Аварийный индикатор ошибок ----------
   Если скрипт падает, ошибка показывается внизу экрана
   (иначе на мобильном её просто не видно). */

window.addEventListener("error", (e) => {
  const d = document.createElement("pre");
  d.textContent = "⚠ Ошибка: " + e.message + "\n" + (e.error && e.error.stack ? e.error.stack.split("\n").slice(0,3).join("\n") : "");
  d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:999;background:#c0392b;color:#fff;padding:8px;font-size:11px;white-space:pre-wrap;margin:0;";
  document.body && document.body.appendChild(d);
});

const STORAGE_KEY = "projects-page.v1";

/* ---------- UID без требования HTTPS ----------
   crypto.randomUUID() доступен только в безопасном контексте;
   на http:// (локальная разработка) он undefined и валил скрипт.
   getRandomValues работает везде. */

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/* ---------- Демо-данные (полностью выдуманные) ---------- */

const CATEGORIES = {
  tech:    { label: "Техника и гаджеты", emoji: "🛠️" },
  garden:  { label: "Дача и сад",        emoji: "🌿" },
  art:     { label: "Творчество",        emoji: "🎨" },
  science: { label: "Исследования",      emoji: "🔬" },
  home:    { label: "Быт и уют",         emoji: "🏠" },
  other:   { label: "Другое",            emoji: "✨" },
};

const STATUSES = {
  idea:   { label: "Идея",     cls: "badge-status-idea" },
  active: { label: "В работе", cls: "badge-status-active" },
  done:   { label: "Завершён", cls: "badge-status-done" },
};

function seedProjects() {
  return [
    {
      id: uid(),
      name: "Северный Ветер",
      desc: "Автономная метеостанция для дачных посёлков: солнечная панель, датчики ветра и влажности, отправка сводки в мессенджер каждое утро.",
      category: "tech",
      status: "active",
      progress: 65,
      createdAt: "2026-05-12",
    },
    {
      id: uid(),
      name: "Тихая Гавань",
      desc: "Генератор звуковых пейзажей: дождь по жестяной крыше, тёплый вечер у печки и скрип старого кресла-качалки для засыпания.",
      category: "art",
      status: "active",
      progress: 40,
      createdAt: "2026-06-03",
    },
    {
      id: uid(),
      name: "КрапИва",
      desc: "Определитель съедобных растений по фотографии: нейросеть отличает крапиву от болиголова и подсказывает рецепт щей.",
      category: "science",
      status: "idea",
      progress: 10,
      createdAt: "2026-06-21",
    },
    {
      id: uid(),
      name: "Дедов Скворечник 2.0",
      desc: "Умный скворечник с камерой и датчиком заселения: следит за птенцами, считает вылеты и присылает открытку, когда выводок покидает дом.",
      category: "garden",
      status: "active",
      progress: 80,
      createdAt: "2026-04-18",
    },
    {
      id: uid(),
      name: "Печкин Телеграф",
      desc: "Ретро-терминал для заметок в стиле почтового отделения: печатаете на клавиатуре — заметка уезжает лентой, как телеграмма, и сохраняется в архив.",
      category: "other",
      status: "done",
      progress: 100,
      createdAt: "2026-03-02",
    },
    {
      id: uid(),
      name: "Огород на Подоконнике",
      desc: "Система капельного полива для ящика с зеленью: помпа из аквариумного компрессора, расписание полива по фазам роста укропа.",
      category: "home",
      status: "active",
      progress: 55,
      createdAt: "2026-07-09",
    },
    {
      id: uid(),
      name: "Скамейка у Пруда",
      desc: "Интерактивная карта тихих мест для отдыха на природе: пользователи отмечают скамейки, тишину и вероятность встретить уток.",
      category: "other",
      status: "idea",
      progress: 5,
      createdAt: "2026-08-15",
    },
    {
      id: uid(),
      name: "Бабушкин Архив",
      desc: "Оцифровка семейных рецептов и фотографий: сканер из старого планшета, распознавание почерка и сборка альбома к юбилею.",
      category: "home",
      status: "active",
      progress: 30,
      createdAt: "2026-02-27",
    },
    {
      id: uid(),
      name: "Комариный Радар",
      desc: "Ультразвуковой отпугиватель комаров с ИИ-режимом: анализирует активность по времени суток и погоде, экономя заряд батареи.",
      category: "tech",
      status: "done",
      progress: 100,
      createdAt: "2026-01-14",
    },
    {
      id: uid(),
      name: "Войлок и Лоза",
      desc: "Мастерская по плетению корзин из садовой лозы: каталог схем, калькулятор материала и дневник первых ученических работ.",
      category: "art",
      status: "active",
      progress: 20,
      createdAt: "2026-09-01",
    },
  ];
}

/* ---------- Хранилище ---------- */

/**
 * Нормализация одного проекта из localStorage.
 * Возвращает null для элементов-мусора (не объектов), для остальных —
 * объект с гарантированно корректными типами и диапазонами:
 *  - name: строка (обрезается до 60 симв. — как maxlength формы)
 *  - desc: строка или "" (до 300 симв.)
 *  - category/status: только известные ключи, иначе дефолт
 *  - progress: число, зажатое в 0–100
 * Защищает от повреждённого/подменённого localStorage (краш рендера).
 */
function sanitizeProject(p) {
  if (p === null || typeof p !== "object" || Array.isArray(p)) return null;
  const name = typeof p.name === "string" ? p.name.trim().slice(0, 60) : "";
  if (!name) return null; // без валидного названия проект бесполезен — отбрасываем
  return {
    id: (typeof p.id === "string" && p.id) ? p.id : uid(),
    name,
    desc: typeof p.desc === "string" ? p.desc.trim().slice(0, 300) : "",
    category: CATEGORIES[p.category] ? p.category : "other",
    status: STATUSES[p.status] ? p.status : "idea",
    progress: Math.min(100, Math.max(0, Number(p.progress) || 0)),
    ...(typeof p.createdAt === "string" && p.createdAt ? { createdAt: p.createdAt } : {}),
  };
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedProjects();
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return seedProjects();
    const clean = data.map(sanitizeProject).filter(Boolean);
    // Если после чистки ничего не осталось И исходник был непустым мусором —
    // показываем пустой список только если это был честный [].
    // Мусорные данные заменяем демо-проектами.
    if (clean.length === 0 && data.length > 0) return seedProjects();
    return clean;
  } catch {
    return seedProjects();
  }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/* ---------- Состояние ---------- */

let projects = loadProjects();
let editingId = null;   // id редактируемого проекта или null (создание)
let query = "";

/* ---------- DOM ---------- */

const $ = (sel) => document.querySelector(sel);

const els = {
  list: $("#project-list"),
  empty: $("#empty-state"),
  emptyTitle: $("#empty-title"),
  emptyText: $("#empty-text"),
  search: $("#search-input"),
  searchClear: $("#search-clear"),
  btnNew: $("#btn-new"),
  btnEmptyNew: $("#btn-empty-new"),
  btnReset: $("#btn-reset"),
  statTotal: $("#stat-total"),
  statActive: $("#stat-active"),
  statDone: $("#stat-done"),
  modal: $("#project-modal"),
  form: $("#project-form"),
  modalTitle: $("#modal-title"),
  fName: $("#f-name"),
  fDesc: $("#f-desc"),
  fCategory: $("#f-category"),
  fStatus: $("#f-status"),
  fProgress: $("#f-progress"),
  fProgressOut: $("#f-progress-out"),
  errName: $("#err-name"),
  btnCancel: $("#btn-cancel"),
  toast: $("#toast"),
};

/* ---------- Утилиты ---------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Выделение совпадения поиска: подсветка подстроки в безопасном HTML. */
function highlight(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const safeQ = escapeHtml(q);
  const idx = safe.toLowerCase().indexOf(safeQ.toLowerCase());
  if (idx === -1) return safe;
  return (
    safe.slice(0, idx) +
    "<mark>" + safe.slice(idx, idx + safeQ.length) + "</mark>" +
    safe.slice(idx + safeQ.length)
  );
}

let toastTimer = null;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

/* ---------- Рендер ---------- */

function renderStats() {
  els.statTotal.textContent = projects.length;
  els.statActive.textContent = projects.filter(p => p.status === "active").length;
  els.statDone.textContent = projects.filter(p => p.status === "done").length;
}

function renderList() {
  const q = query.trim().toLowerCase();
  const visible = q
    ? projects.filter(
        p => p.name.toLowerCase().includes(q) || (p.desc || "").toLowerCase().includes(q)
      )
    : projects;

  els.list.innerHTML = "";

  if (visible.length === 0) {
    els.list.hidden = true;
    els.empty.hidden = false;
    if (q) {
      els.emptyTitle.textContent = "Ничего не найдено";
      els.emptyText.textContent = `По запросу «${query.trim()}» проектов нет. Попробуйте другое слово или создайте новый проект.`;
    } else {
      els.emptyTitle.textContent = "Пока ни одного проекта";
      els.emptyText.textContent = "Самое время создать первый — например, про метеостанцию для дачи.";
    }
    return;
  }

  els.list.hidden = false;
  els.empty.hidden = true;

  const frag = document.createDocumentFragment();

  for (const p of visible) {
    const cat = CATEGORIES[p.category] || CATEGORIES.other;
    const st = STATUSES[p.status] || STATUSES.idea;
    // Defense-in-depth: clamp при рендере, даже если данные попали
    // в память не через loadProjects() (напр. будущая синхронизация вкладок)
    const prog = Math.min(100, Math.max(0, Number(p.progress) || 0));

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <span class="card-emoji" aria-hidden="true">${cat.emoji}</span>
        <div class="card-main">
          <h3 class="card-title">${highlight(p.name, query.trim())}</h3>
          ${p.desc ? `<p class="card-desc">${highlight(p.desc, query.trim())}</p>` : ""}
        </div>
      </div>
      <div class="card-badges">
        <span class="badge">${cat.emoji} ${escapeHtml(cat.label)}</span>
        <span class="badge ${st.cls}">${escapeHtml(st.label)}</span>
      </div>
      <div class="progress-row">
        <div class="progress-track"><div class="progress-fill" style="width:${prog}%"></div></div>
        <span class="progress-value">${prog}%</span>
      </div>
      <div class="card-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-action="edit">✏️ Изменить</button>
        <button type="button" class="btn btn-danger btn-sm" data-action="delete">🗑 Удалить</button>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener("click", () => openModal(p.id));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => removeProject(p.id));

    frag.appendChild(card);
  }

  els.list.appendChild(frag);
}

function render() {
  renderStats();
  renderList();
}

/* ---------- Модальное окно ---------- */

let lastFocused = null;   // элемент, открывший модалку — фокус вернём ему

function openModal(id) {
  lastFocused = document.activeElement;
  editingId = id ?? null;
  const p = id ? projects.find(x => x.id === id) : null;

  els.modalTitle.textContent = p ? "Изменить проект" : "Новый проект";
  els.fName.value = p ? p.name : "";
  els.fDesc.value = p ? (p.desc || "") : "";
  els.fCategory.value = p ? p.category : "tech";
  els.fStatus.value = p ? p.status : "active";
  els.fProgress.value = p ? (Number(p.progress) || 0) : 50;
  els.fProgressOut.textContent = els.fProgress.value + "%";
  els.errName.textContent = "";
  els.fName.classList.remove("invalid");

  els.modal.showModal();
  els.fName.focus();
}

function closeModal() {
  els.modal.close();
  // WCAG 2.4.3: фокус возвращается на элемент, открывший модалку
  if (lastFocused && document.contains(lastFocused)) {
    lastFocused.focus();
    lastFocused = null;
  }
}

function removeProject(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  const ok = window.confirm(`Удалить проект «${p.name}»? Действие необратимо.`);
  if (!ok) return;
  projects = projects.filter(x => x.id !== id);
  saveProjects();
  render();
  showToast(`Проект «${p.name}» удалён`);
}

/* ---------- События ---------- */

els.btnNew.addEventListener("click", () => openModal(null));
els.btnEmptyNew.addEventListener("click", () => openModal(null));

els.btnCancel.addEventListener("click", closeModal);

els.modal.addEventListener("cancel", (e) => {
  // закрытие по Esc приостанавливает анимации — просто закрываем
  e.preventDefault();
  closeModal();
});

els.fProgress.addEventListener("input", () => {
  els.fProgressOut.textContent = els.fProgress.value + "%";
});

els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = els.fName.value.trim();
  if (!name) {
    els.errName.textContent = "Введите название проекта";
    els.fName.classList.add("invalid");
    els.fName.focus();
    return;
  }
  if (projects.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== editingId)) {
    els.errName.textContent = "Проект с таким названием уже есть";
    els.fName.classList.add("invalid");
    els.fName.focus();
    return;
  }

  const data = {
    name,
    desc: els.fDesc.value.trim(),
    category: els.fCategory.value,
    status: els.fStatus.value,
    progress: Number(els.fProgress.value) || 0,
  };

  if (editingId) {
    const idx = projects.findIndex(p => p.id === editingId);
    if (idx !== -1) projects[idx] = { ...projects[idx], ...data };
    showToast(`Проект «${name}» обновлён`);
  } else {
    projects.unshift({
      id: uid(),
      createdAt: new Date().toISOString().slice(0, 10),
      ...data,
    });
    showToast(`Проект «${name}» создан`);
  }

  saveProjects();
  closeModal();
  render();
});

els.fName.addEventListener("input", () => {
  if (els.fName.classList.contains("invalid")) {
    els.fName.classList.remove("invalid");
    els.errName.textContent = "";
  }
});

/* ---------- Поиск ---------- */

els.search.addEventListener("input", () => {
  query = els.search.value;
  els.searchClear.hidden = !query;
  renderList();
});

els.searchClear.addEventListener("click", () => {
  els.search.value = "";
  query = "";
  els.searchClear.hidden = true;
  renderList();
  els.search.focus();
});

/* ---------- Сброс демо-данных ---------- */

els.btnReset.addEventListener("click", () => {
  const ok = window.confirm("Вернуть исходные 10 демо-проектов? Текущие изменения будут потеряны.");
  if (!ok) return;
  projects = seedProjects();
  saveProjects();
  render();
  showToast("Демо-данные восстановлены");
});

/* ---------- Старт ---------- */

render();
