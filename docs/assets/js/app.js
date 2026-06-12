// PTCG VAULT — 資料驅動前台。吃 data/cards.json，後台發布即更新。
(function () {
  "use strict";

  var TYPE_LABEL = {
    grass: "草", fire: "火", water: "水", lightning: "雷", psychic: "超",
    fighting: "鬥", darkness: "惡", metal: "鋼", dragon: "龍", fairy: "妖精", colorless: "無色"
  };
  var CAT_LABEL = { pokemon: "寶可夢", trainer: "訓練家", energy: "能量" };
  var CLASS_LABEL = { normal: "", ex: "EX", mega: "MEGA" };

  var els = {
    grid: document.getElementById("grid"),
    empty: document.getElementById("empty"),
    count: document.getElementById("hdCount"),
    q: document.getElementById("q"),
    fCategory: document.getElementById("f_category"),
    fType: document.getElementById("f_type"),
    fRarity: document.getElementById("f_rarity"),
    fSet: document.getElementById("f_set"),
    fHolo: document.getElementById("f_holo"),
    reset: document.getElementById("reset"),
    drawer: document.getElementById("drawer"),
    drawerBody: document.getElementById("drawerBody"),
    drawerClose: document.getElementById("drawerClose"),
    drawerMask: document.getElementById("drawerMask")
  };

  var CARDS = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function typeLabel(t) { return TYPE_LABEL[t] || t || ""; }

  // 沒有 image_path 時，用卡名 + 屬性色畫一張占位卡面
  function artHTML(card) {
    if (card.image_path) {
      return '<img src="' + esc(card.image_path) + '" alt="' + esc(card.name_zh) +
        '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="gcard__ph" style="display:none;' + phBg(card) + '"><b>' + esc(card.name_zh) +
        '</b><span>' + esc(card.set_code || "") + " · " + esc(card.card_number || "") + "</span></div>";
    }
    return '<div class="gcard__ph" style="' + phBg(card) + '"><b>' + esc(card.name_zh) +
      '</b><span>' + esc(card.set_code || "") + " · " + esc(card.card_number || "") + "</span></div>";
  }

  function phBg(card) {
    var colors = {
      grass: "#1d3a22", fire: "#3a1e16", water: "#16273a", lightning: "#3a3416",
      psychic: "#311a36", fighting: "#33211a", darkness: "#1c1f29", metal: "#23282f",
      dragon: "#2e2713", fairy: "#3a1f30", colorless: "#262a33"
    };
    var c = colors[card.type_code] || "#1b2030";
    return "background:linear-gradient(160deg," + c + ",#0c0e14);";
  }

  function cardHTML(card) {
    var cls = CLASS_LABEL[card.card_class];
    var classTag = cls ? '<span class="gcard__class tt ' + esc(card.card_class) + '">' + esc(cls) + "</span>" : "";
    var rar = card.rarity ? '<span class="gcard__rar">' + esc(card.rarity) + "</span>" : "";
    return '<article class="gcard ' + (card.is_holo ? "holo" : "") + '" data-slug="' + esc(card.slug) + '">' +
      '<div class="gcard__art">' + classTag + rar + artHTML(card) + "</div>" +
      '<div class="gcard__meta">' +
        '<div class="gcard__name">' + esc(card.name_zh) + "</div>" +
        '<div class="gcard__sub">' +
          "<span>" + (card.type_code ? '<i class="dot t-' + esc(card.type_code) + '"></i> ' : "") + esc(typeLabel(card.type_code)) + "</span>" +
          "<span>" + esc(card.set_code || "") + "</span>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function render(list) {
    els.empty.hidden = list.length > 0;
    els.grid.innerHTML = list.map(cardHTML).join("");
    els.count.textContent = list.length + " / " + CARDS.length + " 張卡片";
  }

  function applyFilters() {
    var q = els.q.value.trim().toLowerCase();
    var cat = els.fCategory.value, ty = els.fType.value, ra = els.fRarity.value, st = els.fSet.value, holo = els.fHolo.checked;
    var list = CARDS.filter(function (c) {
      if (cat && c.category_code !== cat) return false;
      if (ty && c.type_code !== ty) return false;
      if (ra && c.rarity !== ra) return false;
      if (st && c.set_code !== st) return false;
      if (holo && !c.is_holo) return false;
      if (q) {
        var hay = (c.name_zh + " " + (c.name_en || "") + " " + (c.card_number || "") + " " + (c.set_name || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    render(list);
  }

  function fillSelect(sel, values, labelFn) {
    values.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(o);
    });
  }

  function uniq(arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); }

  function buildFilters() {
    fillSelect(els.fCategory, uniq(CARDS.map(function (c) { return c.category_code; })), function (v) { return CAT_LABEL[v] || v; });
    fillSelect(els.fType, uniq(CARDS.map(function (c) { return c.type_code; })), typeLabel);
    fillSelect(els.fRarity, uniq(CARDS.map(function (c) { return c.rarity; })));
    fillSelect(els.fSet, uniq(CARDS.map(function (c) { return c.set_code; })));
  }

  function row(dt, dd, cls) {
    if (dd == null || dd === "") return "";
    return '<div class="dv__row"><dt>' + esc(dt) + '</dt><dd class="' + (cls || "") + '">' + esc(dd) + "</dd></div>";
  }

  function openDrawer(slug) {
    var c = CARDS.find(function (x) { return x.slug === slug; });
    if (!c) return;
    var cls = CLASS_LABEL[c.card_class];
    els.drawerBody.innerHTML =
      '<div class="dv__art ' + (c.is_holo ? "holo" : "") + '">' + artHTML(c) + "</div>" +
      '<div class="dv__name">' + esc(c.name_zh) + (cls ? ' <span class="tt ' + esc(c.card_class) + '">' + esc(cls) + "</span>" : "") + "</div>" +
      (c.name_en ? '<div class="dv__en">' + esc(c.name_en) + "</div>" : "") +
      (c.description ? '<p class="dv__desc">' + esc(c.description) + "</p>" : "") +
      '<dl class="dv__rows">' +
        row("卡種", CAT_LABEL[c.category_code] || c.category_code) +
        row("屬性", typeLabel(c.type_code)) +
        row("稀有度", c.rarity) +
        row("HP", c.hp) +
        row("卡包", c.set_name + (c.set_code ? " (" + c.set_code + ")" : "")) +
        row("編號", c.card_number) +
        row("繪師", c.illustrator) +
        row("亮面/閃卡", c.is_holo ? "是" : "否") +
        (c.market_price != null ? row("參考行情", "NT$ " + c.market_price, "dv__price") : "") +
      "</dl>";
    els.drawer.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    els.drawer.hidden = true;
    document.body.style.overflow = "";
  }

  function bind() {
    els.q.addEventListener("input", applyFilters);
    [els.fCategory, els.fType, els.fRarity, els.fSet, els.fHolo].forEach(function (e) {
      e.addEventListener("change", applyFilters);
    });
    els.reset.addEventListener("click", function () {
      els.q.value = ""; els.fCategory.value = ""; els.fType.value = "";
      els.fRarity.value = ""; els.fSet.value = ""; els.fHolo.checked = false;
      applyFilters();
    });
    els.grid.addEventListener("click", function (e) {
      var card = e.target.closest(".gcard");
      if (card) openDrawer(card.getAttribute("data-slug"));
    });
    els.drawerClose.addEventListener("click", closeDrawer);
    els.drawerMask.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
  }

  fetch("data/cards.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (data) {
      CARDS = (data || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
      buildFilters();
      bind();
      render(CARDS);
    })
    .catch(function (err) {
      els.grid.innerHTML = "";
      els.empty.hidden = false;
      els.empty.textContent = "讀取 cards.json 失敗：" + err.message;
    });
})();
