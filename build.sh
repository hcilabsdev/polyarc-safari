#!/usr/bin/env bash
# Build the generated Safari app (which embeds the extension) with xcodebuild.
# Run convert.sh first to generate PolyArc-Xcode/.
#
#   ./build.sh            build the macOS app
#   ./build.sh ios        build the iOS app for the iOS Simulator
#
# For LOCAL dev signing you need an Apple ID added in Xcode (Settings > Accounts);
# that gives you a free "Personal Team" and an automatic signing cert. A paid Apple
# Developer membership is only required to distribute on the App Store.
# (iOS Simulator builds don't need any signing at all.)
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="PolyArc.AI"
PROJ="PolyArc-Xcode/$APP_NAME/$APP_NAME.xcodeproj"
PLATFORM="${1:-macos}"; shift || true

if [ ! -e "$PROJ" ]; then
  echo "ERROR: $PROJ not found. Run ./convert.sh first." >&2
  exit 1
fi

case "$PLATFORM" in
  macos|mac|osx)
    # Override DEVELOPMENT_TEAM with your Team ID if needed:
    #   ./build.sh macos DEVELOPMENT_TEAM=XXXXXXXXXX
    xcodebuild -project "$PROJ" \
      -scheme "$APP_NAME (macOS)" \
      -configuration Debug \
      -derivedDataPath build \
      CODE_SIGN_STYLE=Automatic \
      "$@" \
      build
    echo
    echo "Built. App: build/Build/Products/Debug/$APP_NAME.app"
    echo "Run it once (registers the extension), then enable in:"
    echo "  Safari > Settings > Extensions > PolyArc.AI"
    echo "  (dev builds: Safari > Settings > Advanced > 'Show features for web developers',"
    echo "   then Develop > Allow Unsigned Extensions — resets each Safari launch)"
    ;;
  ios|iphone|ipad)
    # Simulator build needs no signing. Pick any installed iOS Simulator runtime.
    xcodebuild -project "$PROJ" \
      -scheme "$APP_NAME (iOS)" \
      -configuration Debug \
      -derivedDataPath build \
      -sdk iphonesimulator \
      -destination 'generic/platform=iOS Simulator' \
      CODE_SIGNING_ALLOWED=NO \
      "$@" \
      build
    echo
    echo "Built for iOS Simulator: build/Build/Products/Debug-iphonesimulator/$APP_NAME.app"
    echo "Install & run it in a booted Simulator, then enable the extension in:"
    echo "  iOS Settings > Apps > Safari > Extensions > PolyArc.AI  (and allow polymarket.com)"
    echo "For a physical device you must sign with your Apple ID Team (open in Xcode and Run)."
    ;;
  *)
    echo "Usage: ./build.sh [macos|ios] [extra xcodebuild args]" >&2
    exit 2
    ;;
esac
