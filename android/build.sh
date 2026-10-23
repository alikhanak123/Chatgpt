#!/bin/sh
# Builds the Salah Tracker Android app (APK) without Android Studio.
# Needs: Java 17 + Android SDK (platform 34, build-tools 34.0.0) in $TOOLS. The signing key lives outside this repo in $KEYDIR.
set -e
TOOLS="${TOOLS:-/c/Users/obaid/AppData/Local/salah-android-tools}"
KEYDIR="${KEYDIR:-C:/Users/obaid/OneDrive - arabian-industries.net/Desktop/Claude workspace/salah-android-signing}"
OUTDIR="${OUTDIR:-C:/Users/obaid/OneDrive - arabian-industries.net/Desktop/Claude workspace/Salah Tracker APK}"
VERSION="$(grep -o 'versionName="[^"]*"' AndroidManifest.xml | cut -d'"' -f2)"
export JAVA_HOME="$TOOLS/jdk"; export PATH="$JAVA_HOME/bin:$PATH"
BT="$TOOLS/sdk/build-tools/34.0.0"; JAR="$TOOLS/sdk/platforms/android-34/android.jar"
cd "$(dirname "$0")"
rm -rf build && mkdir -p build/gen build/classes build/dex

python make_icons.py
"$BT/aapt2.exe" compile --dir res -o build/res.zip
"$BT/aapt2.exe" link -o build/app-unaligned.apk -I "$JAR" --manifest AndroidManifest.xml -R build/res.zip --java build/gen --auto-add-overlay
javac -nowarn -Xlint:-options -source 1.8 -target 1.8 -bootclasspath "$JAR" -d build/classes $(find src build/gen -name "*.java")
"$BT/d8.bat" --release --lib "$JAR" --min-api 26 --output build/dex $(find build/classes -name "*.class")
python -c "import zipfile; z=zipfile.ZipFile('build/app-unaligned.apk','a'); z.write('build/dex/classes.dex','classes.dex'); z.close()"
"$BT/zipalign.exe" -f -p 4 build/app-unaligned.apk build/app-aligned.apk

# signing key: made once, then reused so the app can be updated in place
mkdir -p "$KEYDIR"
if [ ! -f "$KEYDIR/salah-tracker.jks" ]; then
  python -c "import secrets; print(secrets.token_hex(20))" > "$KEYDIR/keystore-password.txt"
  keytool -genkeypair -keystore "$KEYDIR/salah-tracker.jks" -alias salah -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat "$KEYDIR/keystore-password.txt")" -keypass "$(cat "$KEYDIR/keystore-password.txt")" -dname "CN=Salah Tracker, O=Family, C=OM"
fi
PASS="$(cat "$KEYDIR/keystore-password.txt")"
mkdir -p "$OUTDIR"
"$BT/apksigner.bat" sign --ks "$KEYDIR/salah-tracker.jks" --ks-key-alias salah --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out "$OUTDIR/SalahTracker-$VERSION.apk" build/app-aligned.apk
"$BT/apksigner.bat" verify "$OUTDIR/SalahTracker-$VERSION.apk" && echo "APK ready: $OUTDIR/SalahTracker-$VERSION.apk"
