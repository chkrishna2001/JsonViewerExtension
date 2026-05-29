Add-Type -AssemblyName System.Drawing
$srcPath = "public\icon.png"
$sizes = @(16, 32, 48, 64, 96, 128, 256, 512)

# Load source image
$resolvedPath = (Resolve-Path $srcPath).Path
$srcImg = [System.Drawing.Image]::FromFile($resolvedPath)

foreach ($size in $sizes) {
    # Create new bitmap with target size
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Configure high-quality resampling
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Draw scaled image
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    
    # Save as PNG
    $destPath = Join-Path "public" "icon-$size.png"
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Dispose resources
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created public\icon-$size.png"
}
$srcImg.Dispose()
