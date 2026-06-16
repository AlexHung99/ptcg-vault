# Generate docs/data/cards.json from cards_complete.json, merging prototype data (_proto_cards.json).
# cards_complete.json lacks type/element from set B2 onward; prototype window.PCTG_CARDS has cat/klass for all -> fill gaps.
# ASCII-only source (avoids PowerShell 5.1 non-BOM encoding issues).
param(
  [string]$Src    = "C:\Users\Administrator\Desktop\PTCG\cards_complete.json",
  [string]$Proto  = "C:\GitRepos\ptcg-vault\tools\_proto_cards.json",
  [string]$OutDir = "C:\GitRepos\ptcg-vault\docs\data"
)
$ErrorActionPreference = "Stop"
$SEP = [string][char]0x30FB
$cards = (Get-Content -Raw -Encoding UTF8 $Src) | ConvertFrom-Json
Write-Host "cards_complete: $($cards.Count)"

$pmap = @{}
if (Test-Path $Proto) {
  $protoCards = (Get-Content -Raw -Encoding UTF8 $Proto) | ConvertFrom-Json
  foreach ($p in $protoCards) { if ($p.id) { $pmap[[string]$p.id] = $p } }
  Write-Host "proto fill: $($protoCards.Count)"
}

function Get-Klass($en) {
  if ($en -match '(?i)\bmega\b') { return 'mega' }
  if ($en -match '(?i)\bex\b')   { return 'ex' }
  return 'normal'
}

$out = New-Object System.Collections.Generic.List[object]
$setPacks = @{}; $setCount = @{}

foreach ($c in $cards) {
  $set = [string]$c.set; $num = [int]$c.number; $en = [string]$c.name.en
  $p = $pmap[[string]$c.id]
  $cat = [string]$c.type
  if (-not $cat -and $p) { $cat = [string]$p.cat }
  $el = ([string]$c.element).ToLower()
  if (-not $el -and $p -and $p.type) { $el = ([string]$p.type).ToLower() }
  $klass = if ($p -and $p.klass) { [string]$p.klass } else { Get-Klass $en }

  $o = [ordered]@{
    id=[string]$c.id; set=$set; num=$num
    zh=[string]$c.name.zh; en=$en; ja=[string]$c.name.ja
    rarity=[string]$c.rarity; klass=$klass
    el=$el; cat=$cat; stage="$($c.stage)"
    hp=$c.health; rc=$c.retreatCost; weak=([string]$c.weakness).ToLower(); ef=[string]$c.evolvesFrom
    packs=@($c.packs); img="$set/$num.webp"
  }
  $out.Add($o)
  if (-not $setCount.ContainsKey($set)) { $setCount[$set]=0; $setPacks[$set]=New-Object System.Collections.Generic.List[string] }
  $setCount[$set]++
  foreach ($pk in $c.packs) { if ($setPacks[$set] -notcontains $pk) { $setPacks[$set].Add([string]$pk) } }
}

$order = @('B3a','B3','B2b','B2a','B2','B1a','B1','A4b','A4a','A4','A3b','A3a','A3','A2b','A2a','A2','A1a','A1','PROMO-B','PROMO-A')
$sets = New-Object System.Collections.Generic.List[object]
foreach ($code in $order) { if ($setCount.ContainsKey($code)) { $sets.Add([ordered]@{ code=$code; name=($setPacks[$code] -join $SEP); count=$setCount[$code] }) } }
foreach ($code in $setCount.Keys) { if ($order -notcontains $code) { $sets.Add([ordered]@{ code=$code; name=($setPacks[$code] -join $SEP); count=$setCount[$code] }) } }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$payload = [ordered]@{ generated=(Get-Date).ToString("s"); total=$out.Count; sets=$sets; cards=$out }
[System.IO.File]::WriteAllText((Join-Path $OutDir "cards.json"), ($payload | ConvertTo-Json -Depth 6 -Compress), (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round((Get-Item (Join-Path $OutDir 'cards.json')).Length/1KB)
Write-Host "wrote cards.json: $($out.Count) cards, $kb KB"
$out | Group-Object cat | Sort-Object Count -Descending | ForEach-Object { "  {0,-12} {1}" -f ($_.Name -replace '^$','(blank)'), $_.Count }
