#!/usr/bin/env bash
# Generate the Safari Web Extension Xcode project from the web-extension resources.
#
# This wraps PolyArc's standard MV3 extension (extension/) in the macOS app that
# Safari requires. The web resources are NOT modified — Apple's converter just copies
# extension/ into the generated project's Resources and creates the Swift app +
# extension targets around it.
#
# Requires the FULL Xcode (not just Command Line Tools):
#   xcode-select -p   ->  must point at /Applications/Xcode.app/Contents/Developer
# Install Xcode from the App Store, then:
#   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="PolyArc"
BUNDLE_ID="ai.polyarc.safari"
EXT_DIR="extension"
OUT_DIR="PolyArc-Xcode"

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "ERROR: safari-web-extension-converter not found." >&2
  echo "  The full Xcode is required (you currently have only Command Line Tools)." >&2
  echo "  1) Install Xcode from the App Store" >&2
  echo "  2) sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  exit 1
fi

# No platform flag -> the converter generates BOTH macOS and iOS/iPadOS app targets
# from the one shared extension (Safari on iOS/iPadOS supports Web Extensions 15+).
# (Use --macos-only or --ios-only to restrict to a single platform.)
# --copy-resources : copy extension/ into the project so the project is self-contained
# --no-open / --force : non-interactive, overwrite an existing generated project
xcrun safari-web-extension-converter "$EXT_DIR" \
  --project-location "$OUT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --swift \
  --copy-resources \
  --no-open \
  --force

echo
echo "Generated $OUT_DIR/$APP_NAME/$APP_NAME.xcodeproj  (macOS + iOS targets)"
echo "Next: ./build.sh            # builds the macOS app"
echo "      ./build.sh ios        # builds the iOS app for the Simulator"
echo "Or open the project in Xcode and pick the macOS or iOS scheme to Run."
