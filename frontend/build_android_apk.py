#!/usr/bin/env python3
import os
import zipfile
import subprocess

# Create output directory
os.makedirs('apk_output', exist_ok=True)

# Find aapt
aapt = '/usr/lib/android-sdk/build-tools/29.0.3/aapt'
if not os.path.exists(aapt):
    aapt = subprocess.run(['which', 'aapt'], capture_output=True).stdout.decode().strip()
    if not aapt:
        print("ERROR: aapt not found")
        exit(1)

print("Creating minimal APK structure...")

# Create AndroidManifest.xml (minimal)
manifest = '''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.vmessenger.app"
    android:versionCode="1"
    android:versionName="1.0.0">
    
    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33"/>
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    
    <application 
        android:allowBackup="true"
        android:label="V Messenger"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:label="V Messenger"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
'''

# Create minimal resources
resources_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.Material.NoActionBar">
        <item name="android:windowBackground">@android:color/black</item>
    </style>
</resources>
'''

# Create the APK
with zipfile.ZipFile('apk_output/unsigned.apk', 'w', zipfile.ZIP_DEFLATED) as zf:
    # Add AndroidManifest.xml
    zf.writestr('AndroidManifest.xml', manifest)
    # Add resources
    zf.writestr('res/values/styles.xml', resources_xml)
    # Add JS bundle
    if os.path.exists('android/app/src/main/assets/index.android.bundle'):
        zf.write('android/app/src/main/assets/index.android.bundle', 'assets/index.android.bundle')
    else:
        print("WARNING: JS bundle not found")

print("APK created: apk_output/unsigned.apk")
print("Note: This is a minimal APK for testing. For production, use 'eas build' or Android Studio.")
