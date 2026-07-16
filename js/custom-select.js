/**
 * Accessible custom select — replaces native OS menus with brand-styled panels.
 */
function enhanceSelect(wrapper) {
  const select = wrapper.querySelector("select");
  if (!select || wrapper.dataset.enhanced === "true") return;
  wrapper.dataset.enhanced = "true";

  const options = [...select.options].filter((opt) => !opt.disabled || opt.value === "");
  const placeholder =
    select.querySelector("option[disabled]")?.textContent?.trim() || "Choose an option";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.id = `${select.name || "select"}-trigger`;

  const valueEl = document.createElement("span");
  valueEl.className = "custom-select__value is-placeholder";
  valueEl.textContent = placeholder;
  trigger.appendChild(valueEl);

  const menu = document.createElement("ul");
  menu.className = "custom-select__menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  menu.id = `${select.name || "select"}-menu`;
  trigger.setAttribute("aria-controls", menu.id);

  options.forEach((opt) => {
    if (!opt.value) return;
    const item = document.createElement("li");
    item.setAttribute("role", "option");
    item.dataset.value = opt.value;
    item.textContent = opt.textContent;
    item.tabIndex = -1;
    if (opt.selected && opt.value) {
      item.setAttribute("aria-selected", "true");
      valueEl.textContent = opt.textContent;
      valueEl.classList.remove("is-placeholder");
    }
    menu.appendChild(item);
  });

  select.classList.add("custom-select__native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  wrapper.classList.add("custom-select");
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  const close = () => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    wrapper.classList.remove("is-open");
  };

  const open = () => {
    document.querySelectorAll(".custom-select.is-open").forEach((el) => {
      if (el === wrapper) return;
      el.classList.remove("is-open");
      const t = el.querySelector(".custom-select__trigger");
      const m = el.querySelector(".custom-select__menu");
      if (t) t.setAttribute("aria-expanded", "false");
      if (m) m.hidden = true;
    });
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    wrapper.classList.add("is-open");
  };

  const choose = (item) => {
    const value = item.dataset.value;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    valueEl.textContent = item.textContent;
    valueEl.classList.remove("is-placeholder");
    menu.querySelectorAll('[role="option"]').forEach((opt) => {
      opt.setAttribute("aria-selected", opt === item ? "true" : "false");
    });
    close();
    trigger.focus();
  };

  trigger.addEventListener("click", () => {
    if (menu.hidden) open();
    else close();
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest('[role="option"]');
    if (item) choose(item);
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (menu.hidden) open();
      menu.querySelector('[role="option"]')?.focus();
    }
  });

  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll('[role="option"]')];
    const idx = items.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      trigger.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (document.activeElement?.matches('[role="option"]')) {
        choose(document.activeElement);
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) close();
  });

  select.addEventListener("invalid", () => {
    wrapper.classList.add("is-invalid");
  });
  select.addEventListener("change", () => {
    wrapper.classList.remove("is-invalid");
  });
}

document.querySelectorAll(".form .select").forEach(enhanceSelect);
