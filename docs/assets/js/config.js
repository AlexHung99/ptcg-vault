/*
 * PTCG VAULT 前台設定
 * ─────────────────────────────────────────────
 * PTCG_API_BASE：會員認證後端（Optimind wsPTAUTH.asmx）。
 *   與 miglow 同一個 Optimind 後端，CORS 已是 *。
 *   正式：       "https://api.miglow.vip"（或 PTCG 專用子網域）
 *   本機測試：   "http://localhost/TPMIS"（依你 IIS 站台路徑）
 *
 * PTCG_GOOGLE_CLIENT_ID：Google 登入用 OAuth Client ID。
 *   到 Google Cloud Console 建立，授權的 JavaScript 來源加入本站網域
 *   （例如 https://alexhung99.github.io，或日後的自訂網域）。
 *   留空 = 不顯示 Google 登入按鈕（其餘帳密登入照常）。
 */
window.PTCG_API_BASE = "https://api.miglow.vip";
window.PTCG_GOOGLE_CLIENT_ID = "";
