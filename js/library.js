(() => {
  const search = document.getElementById("library-search");
  const type = document.getElementById("library-type");
  const reset = document.getElementById("library-reset");
  const list = document.getElementById("library-list");
  const count = document.getElementById("library-count");
  if (!list) return;

  const rows = [...list.querySelectorAll(".library-row")];

  function apply() {
    const q = (search?.value || "").trim().toLowerCase();
    const media = type?.value || "";
    let visible = 0;

    rows.forEach((row) => {
      const hay = [
        row.dataset.title,
        row.dataset.author,
        row.dataset.type,
        row.dataset.tags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || hay.includes(q);
      const matchesType = !media || row.dataset.type === media;
      const show = matchesQuery && matchesType;
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (count) {
      count.textContent =
        visible === rows.length
          ? `Showing all ${rows.length} resources`
          : `Showing ${visible} of ${rows.length} resources`;
    }
  }

  search?.addEventListener("input", apply);
  type?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (type) type.value = "";
    apply();
  });

  apply();
})();
