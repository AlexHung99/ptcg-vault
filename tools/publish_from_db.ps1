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

# count cards per set
$setCount = @{}
foreach ($c in $cards) { $s=[string]$c.set; if ($setCount.ContainsKey($s)) { $setCount[$s]++ } else { $setCount[$s]=1 } }

# set names/order from b_ptcg_set
$env:PGPASSWORD = 'Alex@168'
$tmp2 = Join-Path $env:TEMP ("ptcg_sets_" + [Guid]::NewGuid().ToString("N") + ".json")
& $PsqlExe -h 127.0.0.1 -p 5433 -U postgres -d optimind_mix -tA -o $tmp2 -c "SELECT json_agg(json_build_object('code',set_code,'name',COALESCE(NULLIF(set_name,''),set_code),'ord',release_order) ORDER BY release_order, set_code) FROM public.b_ptcg_set WHERE is_deleted=false AND company_uid='$Company';" | Out-Null
$env:PGPASSWORD = $null
$setMeta = (Get-Content -Raw -Encoding UTF8 $tmp2) | ConvertFrom-Json
Remove-Item $tmp2 -ErrorAction SilentlyContinue
$metaCodes = @($setMeta | ForEach-Object { [string]$_.code })

$sets = New-Object System.Collections.Generic.List[object]
foreach ($s in $setMeta) { $code=[string]$s.code; if ($setCount.ContainsKey($code)) { $sets.Add([ordered]@{ code=$code; name=[string]$s.name; count=$setCount[$code] }) } }
foreach ($code in $setCount.Keys) { if ($metaCodes -notcontains $code) { $sets.Add([ordered]@{ code=$code; name=$code; count=$setCount[$code] }) } }

$payload = [ordered]@{ generated=(Get-Date).ToString("s"); total=$cards.Count; sets=$sets; cards=$cards }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $OutDir "cards.json"), ($payload | ConvertTo-Json -Depth 6 -Compress), (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round((Get-Item (Join-Path $OutDir 'cards.json')).Length/1KB)
Write-Host "published cards.json: $($cards.Count) cards, $($sets.Count) sets, $kb KB"
Write-Host "next: cd C:\GitRepos\ptcg-vault; git add docs/data/cards.json; git commit; git push"
