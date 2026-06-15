# Generate docs/data/cards.json from cards_complete.json (ASCII-only source).
param(
  [string]$Src = "C:\Users\Administrator\Desktop\PTCG\cards_complete.json",
  [string]$OutDir = "C:\GitRepos\ptcg-vault\docs\data"
)
$ErrorActionPreference = "Stop"
$SEP = [string][char]0x30FB   # Japanese middle dot for joining pack names
$raw = Get-Content -Raw -Encoding UTF8 $Src
$cards = $raw | ConvertFrom-Json
Write-Host "loaded $($cards.Count) cards"

function Get-Klass($en) {
  if ($en -match '(?i)\bmega\b') { return 'mega' }
  if ($en -match '(?i)\bex\b')   { return 'ex' }
  return 'normal'
}

$out = New-Object System.Collections.Generic.List[object]
$setPacks = @{}
$setCount = @{}

foreach ($c in $cards) {
  $set = [string]$c.set
  $num = [int]$c.number
  $en  = [string]$c.name.en
  $o = [ordered]@{
    id = [string]$c.id; set = $set; num = $num
    zh = [string]$c.name.zh; en = $en; ja = [string]$c.name.ja
    rarity = [string]$c.rarity; klass = (Get-Klass $en)
    el = [string]$c.element; cat = [string]$c.type; stage = "$($c.stage)"
    hp = $c.health; rc = $c.retreatCost; weak = [string]$c.weakness; ef = [string]$c.evolvesFrom
    packs = @($c.packs); img = "$set/$num.webp"
  }
  $out.Add($o)
  if (-not $setCount.ContainsKey($set)) { $setCount[$set] = 0; $setPacks[$set] = New-Object System.Collections.Generic.List[string] }
  $setCount[$set]++
  foreach ($p in $c.packs) { if ($setPacks[$set] -notcontains $p) { $setPacks[$set].Add([string]$p) } }
}

$order = @('B3a','B3','B2b','B2a','B2','B1a','B1','A4b','A4a','A4','A3b','A3a','A3','A2b','A2a','A2','A1a','A1','PROMO-B','PROMO-A')
$sets = New-Object System.Collections.Generic.List[object]
foreach ($code in $order) {
  if ($setCount.ContainsKey($code)) {
    $sets.Add([ordered]@{ code = $code; name = ($setPacks[$code] -join $SEP); count = $setCount[$code] })
  }
}
foreach ($code in $setCount.Keys) {
  if ($order -notcontains $code) { $sets.Add([ordered]@{ code = $code; name = ($setPacks[$code] -join $SEP); count = $setCount[$code] }) }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$payload = [ordered]@{ generated = (Get-Date).ToString("s"); total = $out.Count; sets = $sets; cards = $out }
$json = $payload | ConvertTo-Json -Depth 6 -Compress
[System.IO.File]::WriteAllText((Join-Path $OutDir "cards.json"), $json, (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round((Get-Item (Join-Path $OutDir 'cards.json')).Length / 1KB)
Write-Host "wrote cards.json: $($out.Count) cards, $($sets.Count) sets, $kb KB"
$sets | ForEach-Object { "  {0,-8} {1,-44} {2}" -f $_.code, $_.name, $_.count }
