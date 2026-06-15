// PCTG VAULT — 忠實復刻原型功能的資料驅動站。讀 data/cards.json，圖片走 IMG_BASE（R2）。
(function () {
  "use strict";

  // 圖片來源：正式＝R2 公開網域；本機測試用 ?img=http://localhost:8083/ 覆寫。
  var IMG_BASE = new URLSearchParams(location.search).get("img") || window.PCTG_IMG_BASE || "https://assets.postoria.net/PTCG/";
  if (IMG_BASE && IMG_BASE.slice(-1) !== "/") IMG_BASE += "/";

  var PAGE = 60;
  var EL_ZH = { grass:"草", fire:"火", water:"水", lightning:"雷", psychic:"超", fighting:"鬥", darkness:"惡", metal:"鋼", dragon:"龍", colorless:"無色", fairy:"妖精" };
  var CAT_ZH = { pokemon:"寶可夢", supporter:"支援者", item:"物品", tool:"寶可夢道具", Fossil:"化石" };
  var STAGE_ZH = { basic:"基礎", "1":"一階", "2":"二階", "0":"" };
  var RAR_SYM = { C:"◆", U:"◆◆", R:"◆◆◆", RR:"◆◆◆◆", AR:"★", SR:"★★", SAR:"★★★", IM:"◈", S:"✦", SSR:"✦✦", UR:"♛" };

  var CATF = [
    { k:"pokemon", label:"寶可夢", f:function(c){return c.cat==="pokemon";} },
    { k:"trainer", label:"訓練家", f:function(c){return c.cat!=="pokemon";} },
    { k:"ex", label:"EX", cls:"ex", f:function(c){return c.klass==="ex";} },
    { k:"mega", label:"MEGA", cls:"mega", f:function(c){return c.klass==="mega";} },
    { k:"supporter", label:"支援者", f:function(c){return c.cat==="supporter";} },
    { k:"item", label:"物品", f:function(c){return c.cat==="item";} },
    { k:"tool", label:"寶可夢道具", f:function(c){return c.cat==="tool";} },
    { k:"fossil", label:"化石", f:function(c){return c.cat==="Fossil";} }
  ];
  var ELS = [["grass","草"],["fire","火"],["water","水"],["lightning","雷"],["psychic","超"],["fighting","鬥"],["darkness","惡"],["metal","鋼"],["dragon","龍"],["colorless","無"]];
  var RARS = ["C","U","R","RR","AR","SR","SAR","IM","S","SSR","UR"];

  var $ = function(id){ return document.getElementById(id); };
  var DATA = { sets:[], cards:[] }, SETMAP = {}, CARDMAP = {};
  var view = [], shown = 0;
  var F = { set:"", q:"", cats:{}, els:{}, rars:{} };  // cats/els/rars = 多選集合

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function elZh(e){ return EL_ZH[e]||e||""; }
  function rarSym(r){ return RAR_SYM[r]||r||""; }
  function any(o){ for(var k in o){ if(o[k]) return true; } return false; }

  function imgTag(c){
    if(!c.img) return '<div class="gc__ph">卡圖</div>';
    return '<img src="'+IMG_BASE+esc(c.img)+'" alt="'+esc(c.zh||c.en)+'" loading="lazy" '+
           'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'+
           '<div class="gc__ph" style="display:none">卡圖</div>';
  }
  function cardHTML(c){
    var kl = (c.klass==="ex"||c.klass==="mega") ? '<span class="gc__klass '+c.klass+'">'+(c.klass==="mega"?"MEGA":"EX")+'</span>' : "";
    return '<article class="gc" data-id="'+esc(c.id)+'">'+
      '<div class="gc__art"><span class="gc__id">'+esc(c.id)+'</span>'+kl+imgTag(c)+'</div>'+
      '<div class="gc__meta"><div class="gc__name">'+esc(c.zh||c.en)+'</div>'+
        '<div class="gc__sub"><span class="gc__rar">'+rarSym(c.rarity)+'</span>'+
        (c.el?'<i class="dot e-'+esc(c.el)+'" style="width:9px;height:9px;border-radius:50%" title="'+esc(elZh(c.el))+'"></i>':'')+'</div>'+
      '</div></article>';
  }

  /* ---------- 卡庫 ---------- */
  function renderPage(reset){
    if(reset){ $("grid").innerHTML=""; shown=0; }
    var next = view.slice(shown, shown+PAGE);
    $("grid").insertAdjacentHTML("beforeend", next.map(cardHTML).join(""));
    shown += next.length;
    $("more").hidden = shown >= view.length;
    $("empty").hidden = view.length>0;
    $("resultN").textContent = view.length.toLocaleString()+" 張";
  }
  function applyFilters(){
    var q = F.q.trim().toLowerCase();
    var hasCat = any(F.cats), hasEl = any(F.els), hasRar = any(F.rars);
    view = DATA.cards.filter(function(c){
      if(F.set && c.set!==F.set) return false;
      if(hasCat && !CATF.some(function(cf){ return F.cats[cf.k] && cf.f(c); })) return false;
      if(hasEl && !F.els[c.el]) return false;
      if(hasRar && !F.rars[c.rarity]) return false;
      if(q){ var hay=((c.zh||"")+" "+(c.en||"")+" "+(c.ja||"")+" "+(c.id||"")).toLowerCase(); if(hay.indexOf(q)===-1) return false; }
      return true;
    });
    renderPage(true);
  }
  function buildSets(){
    var h = '<button class="chip is-active" data-set=""><span class="chip__code">ALL</span><span class="chip__name">全部系列</span><span class="chip__n">'+DATA.total.toLocaleString()+'</span></button>';
    h += DATA.sets.map(function(s){ return '<button class="chip" data-set="'+esc(s.code)+'"><span class="chip__code">'+esc(s.code)+'</span><span class="chip__name">'+esc(s.name)+'</span><span class="chip__n">'+s.count+'</span></button>'; }).join("");
    $("sets").innerHTML = h;
  }
  function setActiveChip(code){
    [].forEach.call($("sets").children, function(c){ c.classList.toggle("is-active", c.getAttribute("data-set")===code); });
  }
  function buildFbar(){
    function grp(lab, pills){ return '<div class="fgroup"><span class="fgroup__lab">'+lab+'</span>'+pills+'</div>'; }
    var cat = CATF.map(function(cf){ return '<button class="pill'+(cf.cls?" "+cf.cls:"")+'" data-g="cats" data-k="'+cf.k+'">'+esc(cf.label)+'</button>'; }).join("");
    var el  = ELS.map(function(e){ return '<button class="pill" data-g="els" data-k="'+e[0]+'"><i class="dot e-'+e[0]+'" style="width:9px;height:9px;border-radius:50%"></i>'+e[1]+'</button>'; }).join("");
    var rar = RARS.map(function(r){ return '<button class="pill pill--rar" data-g="rars" data-k="'+r+'">'+rarSym(r)+'</button>'; }).join("");
    $("fbar").innerHTML = grp("卡種", cat) + grp("屬性", el) + grp("稀有度", rar);
  }

  /* ---------- 首頁 ---------- */
  function buildHome(){
    var s = DATA.sets[0];
    var exc = DATA.cards.filter(function(c){return c.set===s.code&&c.klass==="ex";}).length;
    var meg = DATA.cards.filter(function(c){return c.set===s.code&&c.klass==="mega";}).length;
    var feats = DATA.cards.filter(function(c){return c.set===s.code&&(c.klass==="ex"||c.klass==="mega");}).slice(0,6);
    var html =
      '<section class="hero">'+
        '<div class="hero__tag">最新系列 · '+esc(s.code)+'</div>'+
        '<h1 class="hero__title">'+esc(s.name)+'</h1>'+
        '<p class="hero__desc">瀏覽 '+esc(s.code)+' 系列完整卡牌，依屬性、卡類、稀有度快速查找，並組成你的 20 張對戰牌組。</p>'+
        '<div class="hero__stats">'+
          '<div class="hero__stat"><b>'+s.count+'</b><span>收錄卡牌</span></div>'+
          '<div class="hero__stat"><b>'+exc+'</b><span>EX 卡</span></div>'+
          '<div class="hero__stat"><b>'+meg+'</b><span>MEGA 卡</span></div>'+
        '</div>'+
        '<div class="hero__cta"><button class="btn btn--p" data-go-set="'+esc(s.code)+'">瀏覽整個系列 →</button>'+
          '<button class="btn" data-view="lib">搜尋卡牌</button></div>'+
      '</section>'+
      '<section class="feat">'+
        '<div class="fcard" data-view="lib"><div class="fcard__ic">⌕</div><div><div class="fcard__t">搜尋卡牌</div><div class="fcard__s">依屬性、卡類、稀有度、系列查找 '+DATA.total.toLocaleString()+' 張卡</div></div></div>'+
        '<div class="fcard" data-view="deck"><div class="fcard__ic">▤</div><div><div class="fcard__t">我的牌組 &amp; 勝率</div><div class="fcard__s">登入後建立牌組、記錄勝率</div></div></div>'+
        '<div class="fcard" data-view="lib"><div class="fcard__ic">▦</div><div><div class="fcard__t">系列瀏覽</div><div class="fcard__s">'+DATA.sets.length+' 個系列，完整卡牌圖鑑</div></div></div>'+
      '</section>'+
      '<div class="sec__hd"><h2>'+esc(s.code)+' 系列亮點</h2><button class="sec__more" data-go-set="'+esc(s.code)+'">看全部</button></div>'+
      '<section class="grid">'+ feats.map(cardHTML).join("") +'</section>';
    $("view-home").innerHTML = html;
  }

  /* ---------- 詳情 ---------- */
  function row(dt,dd){ if(dd==null||dd===""||dd==="undefined") return ""; return '<div class="dv__row"><dt>'+esc(dt)+'</dt><dd>'+esc(dd)+'</dd></div>'; }
  function openDrawer(id){
    var c = CARDMAP[id]; if(!c) return;
    var s = SETMAP[c.set];
    var kl = (c.klass==="ex"||c.klass==="mega") ? '<span class="dv__klass" style="'+(c.klass==="ex"?"background:#f4be1b;color:#1a1408":"background:linear-gradient(90deg,#ff6b3d,#b15fd0);color:#fff")+'">'+(c.klass==="mega"?"MEGA":"EX")+'</span>' : "";
    var alt = [c.en, c.ja].filter(Boolean).join(" · ");
    $("dwBody").innerHTML =
      '<div class="dv__art">'+imgTag(c)+'</div>'+
      '<div class="dv__name">'+esc(c.zh||c.en)+kl+'</div>'+
      (alt?'<div class="dv__alt">'+esc(alt)+'</div>':'')+
      '<div class="dv__chips">'+
        (c.el?'<span class="dv__chip"><i class="dot e-'+esc(c.el)+'" style="width:9px;height:9px;border-radius:50%"></i>'+esc(elZh(c.el))+'</span>':'')+
        '<span class="dv__chip">'+esc(c.cat==="pokemon"?"寶可夢":(CAT_ZH[c.cat]||"訓練家"))+'</span>'+
        '<span class="dv__chip" style="color:#f4be1b">'+rarSym(c.rarity)+' '+esc(c.rarity)+'</span>'+
      '</div>'+
      '<dl class="dv__rows">'+
        row("編號", c.id)+ row("系列", (s?s.name+" ("+c.set+")":c.set))+
        row("階段", STAGE_ZH[c.stage]!==undefined?STAGE_ZH[c.stage]:c.stage)+
        row("進化自", c.ef)+ row("HP", c.hp)+ row("撤退費", c.rc)+
        row("弱點", c.weak?elZh(c.weak)+"（"+c.weak+"）":"")+
        row("卡包", (c.packs&&c.packs.length)?c.packs.join("、"):"")+
      '</dl>';
    $("drawer").hidden=false; document.body.style.overflow="hidden";
  }
  function closeDrawer(){ $("drawer").hidden=true; document.body.style.overflow=""; }

  /* ---------- view 切換 ---------- */
  function showView(v){
    ["home","lib","deck","auth"].forEach(function(x){ $("view-"+x).classList.toggle("is-active", x===v); });
    [].forEach.call(document.querySelectorAll(".hd__tab"), function(t){ t.classList.toggle("is-active", t.getAttribute("data-view")===v); });
    window.scrollTo(0,0);
  }
  function goSet(code){
    F.set = code; setActiveChip(code); applyFilters(); showView("lib");
  }

  /* ---------- 登入 / 註冊 ---------- */
  function setAuthTab(which){
    ["login","register"].forEach(function(w){
      document.querySelector('.auth__tab[data-auth="'+w+'"]').classList.toggle("is-active", w===which);
      $(w+"Form").classList.toggle("is-active", w===which);
    });
    $("authNotice").hidden = true;
  }
  function setErr(input, msg){
    var f=input.closest(".afield"); if(f){ f.classList.toggle("bad", !!msg); var e=f.querySelector(".aerr"); if(e) e.textContent=msg||""; }
    return !msg;
  }
  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function authNotice(msg, ok){ var n=$("authNotice"); n.hidden=false; n.className="auth__notice "+(ok?"ok":"err"); n.textContent=msg; }

  function initAuth(){
    // 密碼顯示/隱藏
    document.addEventListener("click", function(e){
      var t=e.target.closest(".apass__t"); if(!t) return;
      var inp=$(t.getAttribute("data-toggle")); if(!inp) return;
      var show=inp.type==="password"; inp.type=show?"text":"password"; t.textContent=show?"隱藏":"顯示";
    });
    // 登入提交
    $("loginForm").addEventListener("submit", function(e){
      e.preventDefault();
      var em=$("lEmail"), pw=$("lPass"), ok=true;
      ok=setErr(em, validEmail(em.value.trim())?"":"請輸入有效的電子郵件")&&ok;
      ok=setErr(pw, pw.value?"":"請輸入密碼")&&ok;
      if(!ok) return;
      authNotice("帳號系統建置中：登入功能將於後台串接完成後開放。", true);
    });
    // 註冊提交
    $("registerForm").addEventListener("submit", function(e){
      e.preventDefault();
      var nm=$("rName"), em=$("rEmail"), pw=$("rPass"), p2=$("rPass2"), ag=$("rAgree"), ok=true;
      ok=setErr(nm, nm.value.trim()?"":"請輸入暱稱")&&ok;
      ok=setErr(em, validEmail(em.value.trim())?"":"請輸入有效的電子郵件")&&ok;
      ok=setErr(pw, pw.value.length>=6?"":"密碼至少 6 碼")&&ok;
      ok=setErr(p2, p2.value===pw.value&&p2.value?"":"兩次密碼不一致")&&ok;
      if(!ok) return;
      if(!ag.checked){ authNotice("請先勾選同意服務條款與隱私權政策。", false); return; }
      authNotice("帳號系統建置中：註冊功能將於後台串接完成後開放。", true);
    });
  }

  function bind(){
    // nav + 任何 data-view
    document.addEventListener("click", function(e){
      var au = e.target.closest("[data-auth]"); if(au){ setAuthTab(au.getAttribute("data-auth")); return; }
      var v = e.target.closest("[data-view]"); if(v){ showView(v.getAttribute("data-view")); return; }
      var gs = e.target.closest("[data-go-set]"); if(gs){ goSet(gs.getAttribute("data-go-set")); return; }
    });
    // 搜尋
    var t; $("q").addEventListener("input", function(){ clearTimeout(t); t=setTimeout(function(){ F.q=$("q").value; applyFilters(); },160); });
    // 系列 chips
    $("sets").addEventListener("click", function(e){ var ch=e.target.closest(".chip"); if(!ch) return; F.set=ch.getAttribute("data-set"); setActiveChip(F.set); applyFilters(); });
    // 篩選 pills
    $("fbar").addEventListener("click", function(e){ var p=e.target.closest(".pill"); if(!p) return; var g=p.getAttribute("data-g"),k=p.getAttribute("data-k"); F[g][k]=!F[g][k]; p.classList.toggle("on",F[g][k]); applyFilters(); });
    // 清除
    $("clearF").addEventListener("click", function(){ F={set:"",q:"",cats:{},els:{},rars:{}}; $("q").value=""; setActiveChip(""); [].forEach.call(document.querySelectorAll(".pill.on"),function(p){p.classList.remove("on");}); applyFilters(); });
    $("moreBtn").addEventListener("click", function(){ renderPage(false); });
    // 卡片點擊（事件委派，涵蓋首頁亮點與卡庫）
    document.addEventListener("click", function(e){ var c=e.target.closest(".gc"); if(c) openDrawer(c.getAttribute("data-id")); });
    $("dwClose").addEventListener("click", closeDrawer); $("dwMask").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function(e){ if(e.key==="Escape") closeDrawer(); });
  }

  fetch("data/cards.json", {cache:"no-cache"})
    .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
    .then(function(d){
      DATA = d;
      d.sets.forEach(function(s){ SETMAP[s.code]=s; });
      d.cards.forEach(function(c){ CARDMAP[c.id]=c; });
      $("ftTotal").textContent = d.total.toLocaleString();
      buildHome(); buildSets(); buildFbar(); bind(); initAuth();
      view = DATA.cards.slice(); renderPage(true);
    })
    .catch(function(err){ $("view-home").innerHTML='<p class="empty">讀取 cards.json 失敗：'+esc(err.message)+'</p>'; });
})();
