<#
.SYNOPSIS
  Exports the workshop deck to the slide images, thumbnails, PDF and manifest
  used by the slide viewer on the Agenda page.

.DESCRIPTION
  Requires Windows with Microsoft PowerPoint installed. Re-run it whenever the
  presentation changes, then commit the updated files in assets/slides/.

  Hidden slides are skipped. Speaker notes are never exported.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\export-slides.ps1 -Deck "C:\path\to\deck.pptx"
#>
param(
  [Parameter(Mandatory = $true)][string]$Deck,
  [string]$OutDir = '',
  [string]$PdfName = 'stress-test-fred-slides.pdf',
  [int]$Width = 1920,
  [int]$ThumbWidth = 384,
  [int]$Quality = 85
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$scriptRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptRoot)) {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrWhiteSpace($scriptRoot)) {
  throw 'Unable to determine the export script directory. Pass an explicit -OutDir path.'
}
if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $scriptRoot '..\assets\slides'
}

$deckPath = (Resolve-Path -LiteralPath $Deck).Path
$OutDir = [System.IO.Path]::GetFullPath($OutDir)
$thumbDir = Join-Path $OutDir 'thumbs'
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ('slide-export-' + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $OutDir, $thumbDir, $tempDir | Out-Null

# Remove the previous export so deleted slides do not linger.
Get-ChildItem -LiteralPath $OutDir, $thumbDir -Filter 'slide-*.jpg' | Remove-Item -Force

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Jpeg([System.Drawing.Image]$Image, [string]$Path, [int]$W, [int]$H) {
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $attrs = New-Object System.Drawing.Imaging.ImageAttributes
  $attrs.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $g.DrawImage($Image, (New-Object System.Drawing.Rectangle 0, 0, $W, $H), 0, 0, $Image.Width, $Image.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
  $bmp.Save($Path, $jpegCodec, $params)
  $attrs.Dispose(); $g.Dispose(); $bmp.Dispose()
}

# The slide title is taken to be the topmost text set at 28pt or larger
# (or, if there is none, the text in the largest font). Used as alt text.
function Get-SlideTitle($Slide) {
  $texts = @()
  foreach ($shape in $Slide.Shapes) {
    if (-not $shape.HasTextFrame) { continue }
    if (-not $shape.TextFrame.HasText) { continue }
    $range = $shape.TextFrame.TextRange
    $texts += [pscustomobject]@{ Size = $range.Runs(1).Font.Size; Top = $shape.Top; Text = $range.Text }
  }
  if (-not $texts) { return '' }
  $threshold = [Math]::Min(28, ($texts | Measure-Object Size -Maximum).Maximum)
  $best = ($texts | Where-Object { $_.Size -ge $threshold } | Sort-Object Top | Select-Object -First 1).Text
  $best = ($best -replace '[\r\n\v\u000b]+', ' ' -replace '\s+', ' ').Trim()
  if ($best.Length -gt 120) { $best = $best.Substring(0, 117).TrimEnd() + '...' }
  return $best
}

# PowerPoint is single-instance: only quit it afterwards if we started it.
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  # Open(FileName, ReadOnly, Untitled, WithWindow)
  $pres = $app.Presentations.Open($deckPath, -1, 0, 0)
  $height = [int][Math]::Round($Width * $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth)
  $thumbHeight = [int][Math]::Round($ThumbWidth * $height / $Width)

  $manifest = @()
  $n = 0
  foreach ($slide in $pres.Slides) {
    if ($slide.SlideShowTransition.Hidden -eq -1) { continue }
    $n++
    $name = 'slide-{0:D2}.jpg' -f $n
    $png = Join-Path $tempDir ('{0:D2}.png' -f $n)
    $slide.Export($png, 'PNG', $Width, $height)

    $img = [System.Drawing.Image]::FromFile($png)
    Save-Jpeg $img (Join-Path $OutDir $name) $Width $height
    Save-Jpeg $img (Join-Path $thumbDir $name) $ThumbWidth $thumbHeight
    $img.Dispose()

    $manifest += [ordered]@{
      src   = "assets/slides/$name"
      thumb = "assets/slides/thumbs/$name"
      title = (Get-SlideTitle $slide)
    }
    Write-Host ("Exported {0}  {1}" -f $name, $manifest[-1].title)
  }

  $pdfPath = Join-Path $OutDir $PdfName
  if (Test-Path -LiteralPath $pdfPath) { Remove-Item -LiteralPath $pdfPath -Force }
  $pres.SaveCopyAs($pdfPath, 32)  # 32 = ppSaveAsPDF
  Write-Host "Saved $PdfName"
}
finally {
  if ($pres) { $pres.Close() }
  if (-not $wasRunning) { $app.Quit() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
  Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

$data = [ordered]@{ pdf = "assets/slides/$PdfName"; slides = $manifest }
$js = "// Generated by scripts/export-slides.ps1. Do not edit by hand; re-run the script instead.`n" +
      "window.WORKSHOP_SLIDES = " + ($data | ConvertTo-Json -Depth 4) + ";`n"
[System.IO.File]::WriteAllText((Join-Path $OutDir 'slides.js'), $js, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Wrote slides.js with $n slides"
