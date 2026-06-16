# Publish: read b_ptcg_card from DB -> regenerate docs/data/cards.json (same shape the frontend reads).
# Run after editing cards in the PT_CARD backend. (git commit/push is a separate step.)
# ASCII-only source.
param(
  [string]$OutDir  = "C:\GitRepos\ptcg-vault\docs\data",
  [string]$PsqlExe = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  [string]$Company = "7f4dc6a0-1b4a-4a1f-9f69-91bb1d9f7c2b"
)
$ErrorActionPreference = "Stop"
$env:PGPASSWORD = 'Alex@168'
$env:PGCLIENTENCODING = 'UTF8'
$SEP = [string][char]0x30FB

$q = @"
SELECT json_agg(json_build_object(
  'id',card_id,'set',set_code,'num',card_number,'zh',name_zh,'en',name_en,'ja',name_ja,
  'rarity',rarity,'klass',card_class,'el',element,'cat',category,'stage',stage,
  'hp',hp,'rc',retreat_cost,'weak',weakness,'ef',evolves_from,
  'packs',string_to_array(coalesce(nullif(packs,''),'placeholder'),','),'img',image_path
) ORDER BY set_code, card_number)
FROM public.b_ptcg_card WHERE is_deleted=false AND is_active=true AND company_uid='$Company';
"@

$tmp = Join-Path $env:TEMP ("ptcg_export_" + [Guid]::NewGuid().ToString("N") + ".json")
& $PsqlExe -h 127.0.0.1 -p 5433 -U postgres -d optimind_mix -tA -o $tmp -c $q | Out-Null
$env:PGPASSWORD = $null
$parsed = (Get-Content -Raw -Encoding UTF8 $tmp) | ConvertFrom-Json
Remove-Item $tmp -ErrorAction SilentlyContinue
$cards = New-Object System.Collections.Generic.List[object]
foreach ($c in $parsed) { $cards.Add($c) }
Write-Host "read from DB: $($cards.Count) cards"

# packs: turn 'placeholder' sentinel back to empty
foreach ($c in $cards) { if ($c.packs.Count -eq 1 -and $c.packs[0] -eq 'placeholder') { $c.packs = @() } }

# derive sets (code,name,count) from packs, newest-first
$setPacks = @{}; $setCount = @{}
foreach ($c in $cards) {
  $s = [string]$c.set
  if (-not $setCount.ContainsKey($s)) { $setCount[$s]=0; $setPacks[$s]=New-Object System.Collections.Generic.List[string] }
  $setCount[$s]++
  foreach ($p in $c.packs) { if ($p -and $setPacks[$s] -notcontains $p) { $setPacks[$s].Add([string]$p) } }
}
$order = @('B3a','B3','B2b','B2a','B2','B1a','B1','A4b','A4a','A4','A3b','A3a','A3','A2b','A2a','A2','A1a','A1','PROMO-B','PROMO-A')
$sets = New-Object System.Collections.Generic.List[object]
foreach ($code in $order) { if ($setCount.ContainsKey($code)) { $sets.Add([ordered]@{ code=$code; name=($setPacks[$code] -join $SEP); count=$setCount[$code] }) } }
foreach ($code in $setCount.Keys) { if ($order -notcontains $code) { $sets.Add([ordered]@{ code=$code; name=($setPacks[$code] -join $SEP); count=$setCount[$code] }) } }

$payload = [ordered]@{ generated=(Get-Date).ToString("s"); total=$cards.Count; sets=$sets; cards=$cards }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $OutDir "cards.json"), ($payload | ConvertTo-Json -Depth 6 -Compress), (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round((Get-Item (Join-Path $OutDir 'cards.json')).Length/1KB)
Write-Host "published cards.json: $($cards.Count) cards, $($sets.Count) sets, $kb KB"
Write-Host "next: cd C:\GitRepos\ptcg-vault; git add docs/data/cards.json; git commit; git push"
