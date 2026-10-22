# แปลงไฟล์ .svg ทุกไฟล์ในโฟลเดอร์นี้เป็น .png ความละเอียด 2 เท่า สำหรับแทรกลง Word
#
# ทำไมต้องรันบน Windows — ภาพมีข้อความภาษาไทย ซึ่งต้องใช้ฟอนต์ไทยในเครื่องตอนแปลง
# สคริปต์นี้ใช้ Microsoft Edge (มีในทุกเครื่อง Windows 10/11) แบบไม่เปิดหน้าต่าง
#
# วิธีรัน (PowerShell ที่โฟลเดอร์โปรเจกต์):
#   powershell -ExecutionPolicy Bypass -File docs\thesis\figures\svg-to-png.ps1
# แปลงเฉพาะบางไฟล์:
#   powershell -ExecutionPolicy Bypass -File docs\thesis\figures\svg-to-png.ps1 -Filter "fig3-*activity*"

param(
  [string]$Filter = "fig*",
  [int]$Scale = 2
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw "ไม่พบ Microsoft Edge ในเครื่อง" }

$files = Get-ChildItem -Path $here -Filter "$Filter.svg" | Sort-Object Name
if (-not $files) { Write-Host "ไม่พบไฟล์ $Filter.svg"; exit 0 }

foreach ($f in $files) {
  $svg = Get-Content -Raw -Encoding UTF8 $f.FullName
  # ขนาดภาพอ่านจาก width/height ของ <svg> — ไฟล์ต้องมีค่าตายตัว (ไม่ใช่ width="100%")
  $m = [regex]::Match($svg, '<svg[^>]*\swidth="(\d+(?:\.\d+)?)"[^>]*\sheight="(\d+(?:\.\d+)?)"')
  if (-not $m.Success) { Write-Warning "ข้าม $($f.Name) — ไม่มี width/height แบบตัวเลข"; continue }
  $w = [math]::Ceiling([double]$m.Groups[1].Value)
  $h = [math]::Ceiling([double]$m.Groups[2].Value)

  $png = [IO.Path]::ChangeExtension($f.FullName, ".png")
  $url = "file:///" + ($f.FullName -replace '\\', '/')
  $edgeArgs = @(
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--user-data-dir=$env:TEMP\edge-svg2png",
    "--force-device-scale-factor=$Scale",
    "--window-size=$w,$h",
    "--screenshot=`"$png`"",
    "`"$url`""
  )
  if (Test-Path $png) { Remove-Item $png }   # ลบของเก่าก่อน จะได้รู้ว่าแปลงสำเร็จจริง
  Start-Process -FilePath $edge -ArgumentList $edgeArgs -Wait -NoNewWindow
  if (Test-Path $png) {
    Write-Host ("OK   {0,-40} {1}x{2} px" -f ($f.BaseName + ".png"), ($w*$Scale), ($h*$Scale))
  } else {
    Write-Warning "แปลงไม่สำเร็จ: $($f.Name)"
  }
}
