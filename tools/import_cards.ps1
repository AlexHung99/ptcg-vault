# Generate import_cards.sql from docs/data/cards.json -> INSERT into b_ptcg_card. ASCII-only source.
param(
  [string]$Src     = "C:\GitRepos\ptcg-vault\docs\data\cards.json",
  [string]$OutSql  = "C:\GitRepos\ptcg-vault\tools\import_cards.sql",
  [string]$Company = "7f4dc6a0-1b4a-4a1f-9f69-91bb1d9f7c2b"
)
$ErrorActionPreference = "Stop"
$d = (Get-Content -Raw -Encoding UTF8 $Src) | ConvertFrom-Json
function Q($v){ if ($null -eq $v -or "$v" -eq "") { return "NULL" }; return "'" + (("" + $v) -replace "'","''") + "'" }
function N($v){ if ($null -eq $v -or "$v" -eq "") { return "NULL" }; return [string][int]$v }

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("-- Auto-generated import for b_ptcg_card ($($d.cards.Count) cards). Re-runnable.")
[void]$sb.AppendLine("DELETE FROM public.b_ptcg_card WHERE company_uid = '$Company';")
$cols = "(company_uid, card_id, set_code, card_number, name_zh, name_en, name_ja, rarity, card_class, element, category, stage, hp, retreat_cost, weakness, evolves_from, packs, image_path, sort_order, is_active)"

$i = 0; $batch = 0
foreach ($c in $d.cards) {
  if ($batch -eq 0) { [void]$sb.AppendLine("INSERT INTO public.b_ptcg_card $cols VALUES") }
  $packs = if ($c.packs) { ($c.packs -join ",") } else { "" }
  $row = "('$Company'," + (Q $c.id) + "," + (Q $c.set) + "," + (N $c.num) + "," + (Q $c.zh) + "," + (Q $c.en) + "," + (Q $c.ja) + "," +
         (Q $c.rarity) + "," + (Q $c.klass) + "," + (Q $c.el) + "," + (Q $c.cat) + "," + (Q $c.stage) + "," + (N $c.hp) + "," +
         (N $c.rc) + "," + (Q $c.weak) + "," + (Q $c.ef) + "," + (Q $packs) + "," + (Q $c.img) + "," + (N $c.num) + ",true)"
  $i++; $batch++
  $term = if ($batch -ge 500 -or $i -eq $d.cards.Count) { ";" } else { "," }
  [void]$sb.AppendLine($row + $term)
  if ($term -eq ";") { $batch = 0 }
}
[System.IO.File]::WriteAllText($OutSql, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "wrote $OutSql : $i rows, $([math]::Round((Get-Item $OutSql).Length/1KB)) KB"
