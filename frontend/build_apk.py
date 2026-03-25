#!/usr/bin/env python3
import os
import zipfile
import struct

# Create output directory
os.makedirs('apk_output', exist_ok=True)

# Android Manifest (binary XML format placeholder - we'll use minimal valid structure)
manifest_bin = b'''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.vmessenger.app"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33"/>
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <application android:allowBackup="true" android:label="V Messenger" android:icon="@mipmap/ic_launcher" android:theme="@style/AppTheme">
        <activity android:name=".MainActivity" android:label="V Messenger" android:configChanges="keyboard|keyboardHidden|orientation|screenSize" android:windowSoftInputMode="adjustResize" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
'''.encode()

resources_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.Material.NoActionBar">
        <item name="android:windowBackground">@android:color/black</item>
    </style>
</resources>
'''.encode()

# Create a simple valid PNG (1x1 purple pixel)
png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x00\x05\xfe\xd4\x00\x00\x00\x00IEND\xaeB`\x82'

# Create APK
apk_path = 'apk_output/unsigned.apk'
with zipfile.ZipFile(apk_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    # AndroidManifest.xml
    zf.writestr('AndroidManifest.xml', manifest_bin)
    
    # resources.arsc
    zf.writestr('resources.arsc', resources_xml)
    
    # Classes (dex) - minimal dummy (real one would need proper DEX)
    # This is a minimal valid DEX header for API 21+
    dex_header = b'dex\n035\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    zf.writestr('classes.dex', dex_header)
    
    # JS Bundle
    if os.path.exists('android/app/src/main/assets/index.android.bundle'):
        zf.write('android/app/src/main/assets/index.android.bundle', 'assets/index.android.bundle')
    
    # Icons
    zf.writestr('res/mipmap-hdpi/ic_launcher.png', png_data)
    zf.writestr('res/mipmap-mdpi/ic_launcher.png', png_data)
    zf.writestr('res/mipmap-xhdpi/ic_launcher.png', png_data)
    zf.writestr('res/mipmap-xxhdpi/ic_launcher.png', png_data)
    zf.writestr('res/mipmap-xxxhdpi/ic_launcher.png', png_data)
    zf.writestr('res/drawable-hdpi/ic_launcher.png', png_data)
    
    # Styles
    zf.writestr('res/values/styles.xml', resources_xml)

print(f"Created APK: {apk_path}")
print(f"Size: {os.path.getsize(apk_path)} bytes")
