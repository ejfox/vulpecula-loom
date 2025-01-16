#!/bin/bash

# Paths to source PNGs
SOURCE_PNG="dist/icon-source/vulpecula_icon_r2.png"
TRAY_PNG="dist/icon-source/tray_r1.png"

# Create directories
mkdir -p build/icons/icon.iconset

# Generate different sizes
sizes=(16 32 48 64 128 256 512)
for size in "${sizes[@]}"; do
    magick "$SOURCE_PNG" -resize ${size}x${size} build/icons/${size}x${size}.png
done

# Create macOS iconset
cp build/icons/16x16.png build/icons/icon.iconset/icon_16x16.png
cp build/icons/32x32.png build/icons/icon.iconset/icon_16x16@2x.png
cp build/icons/32x32.png build/icons/icon.iconset/icon_32x32.png
cp build/icons/64x64.png build/icons/icon.iconset/icon_32x32@2x.png
cp build/icons/128x128.png build/icons/icon.iconset/icon_128x128.png
cp build/icons/256x256.png build/icons/icon.iconset/icon_128x128@2x.png
cp build/icons/256x256.png build/icons/icon.iconset/icon_256x256.png
cp build/icons/512x512.png build/icons/icon.iconset/icon_256x256@2x.png
cp build/icons/512x512.png build/icons/icon.iconset/icon_512x512.png
cp build/icons/512x512.png build/icons/icon.iconset/icon_512x512@2x.png

# Generate icns
iconutil -c icns build/icons/icon.iconset -o build/icon.icns

# Generate ico for Windows
magick build/icons/16x16.png build/icons/32x32.png build/icons/48x48.png build/icons/64x64.png build/icons/128x128.png build/icons/256x256.png dist/logo.ico

# Generate tray icons
magick "$TRAY_PNG" -resize 16x16 build/icons/tray-icon.png
magick "$TRAY_PNG" -resize 16x16 -modulate 100,0 build/icons/tray-icon-Template.png 