# CURSOR PROMPT — APP STORE LAUNCH & PRODUCTION HARDENING

## Context

App: Diedericks Dobermanns  
Bundle ID: com.diedericksdobermanns.app  
Supabase: nlmwxodvquwbjinhhbmr  
Stack: React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind  
EAS Build: Already configured in eas.json (production profile uses autoIncrement + appVersionSource remote)  
Brand: Background #111008 | Surface #1C1A0E | Gold #C4A35A | Text #F5F0E8

The app is feature-complete and ready for App Store submission. This prompt covers all tasks required to go live on Apple App Store and Google Play Store. Execute tasks in order.

---

## PHASE 1 — app.json Production Updates

### Task 1.1 — Add Privacy Policy URL to app.json

In `app.json`, inside the `expo` object, add:
```json
"privacyPolicyUrl": "https://www.diedericksdobermanns.com/privacy-policy"
```

Also ensure the following are present:
```json
"ios": {
  "bundleIdentifier": "com.diedericksdobermanns.app",
  "buildNumber": "1",
  "supportsTablet": false,
  "infoPlist": {
    "NSPhotoLibraryUsageDescription": "Diedericks Dobermanns needs access to your photo library to upload dog photos and documents.",
    "NSCameraUsageDescription": "Diedericks Dobermanns needs camera access to capture photos for your dog profile and documents.",
    "NSPhotoLibraryAddUsageDescription": "Diedericks Dobermanns saves photos to your library.",
    "NSMicrophoneUsageDescription": "Diedericks Dobermanns uses the microphone during video recording only.",
    "NSUserNotificationsUsageDescription": "Receive training reminders, puppy availability alerts, and booking confirmations."
  }
}
```

For Android, ensure:
```json
"android": {
  "package": "com.diedericksdobermanns.app",
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.VIBRATE",
    "android.permission.POST_NOTIFICATIONS"
  ]
}
```

---

## PHASE 2 — Apple Privacy Manifest (Required since May 2024)

### Task 2.1 — Create PrivacyInfo.xcprivacy

Create file: `ios/PrivacyInfo.xcprivacy`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>35F9.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePhoneNumber</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePhotosOrVideos</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

Also add the privacy manifest plugin to app.json plugins array:
```json
[
  "expo-build-properties",
  {
    "ios": {
      "privacyManifestAggregationEnabled": true
    }
  }
]
```

If `expo-build-properties` is not installed, run: `npx expo install expo-build-properties`

---

## PHASE 3 — Security Audit

### Task 3.1 — Environment Variable Audit

Search the entire codebase for any occurrence of `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE` or the literal service role key string. If found, this is a CRITICAL security breach — remove it immediately and rotate the key in Supabase dashboard.

The `.env` file should contain:
```
EXPO_PUBLIC_SUPABASE_URL=https://nlmwxodvquwbjinhhbmr.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon key only]
```

The service role key must NEVER appear in any client-side variable.

### Task 3.2 — Verify SecureStore Usage

In `lib/supabase.ts`, confirm that the Supabase client is configured with a SecureStore adapter:

```typescript
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

If AsyncStorage is being used instead of SecureStore, replace it. SecureStore is encrypted on device. AsyncStorage is not.

### Task 3.3 — Console.log Audit for Sensitive Data

Search for any `console.log` statements that output:
- JWT tokens or session objects containing `access_token`
- User passwords (should be impossible but check)
- Full user profile objects (may contain PII)

Replace logging of session/token objects with: `console.log('[Auth] Session active:', !!session)`

### Task 3.4 — Deep Link Security

In `app.json`, confirm the scheme is set:
```json
"scheme": "diedericksdobermanns"
```

In `lib/auth.ts`, `sendPasswordReset` already uses `diedericksdobermanns://reset-password`. Confirm this matches. No other deep link routes should trigger auth actions without verifying the full URL.

---

## PHASE 4 — In-App Legal Screens

### Task 4.1 — Add Terms & Privacy to Onboarding/Sign-Up

In the sign-up screen (`app/(auth)/sign-up.tsx` or equivalent), below the sign-up button, add:

```tsx
<Text style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 16 }}>
  By creating an account, you agree to our{' '}
  <Text
    style={{ color: '#C4A35A', textDecorationLine: 'underline' }}
    onPress={() => Linking.openURL('https://www.diedericksdobermanns.com/terms')}
  >
    Terms & Conditions
  </Text>
  {' '}and{' '}
  <Text
    style={{ color: '#C4A35A', textDecorationLine: 'underline' }}
    onPress={() => Linking.openURL('https://www.diedericksdobermanns.com/privacy-policy')}
  >
    Privacy Policy
  </Text>
  .
</Text>
```

Import `Linking` from `react-native`.

### Task 4.2 — Settings Screen Legal Links

In the Settings/Profile screen, add a "Legal" section containing:
- Terms & Conditions (opens URL)
- Privacy Policy (opens URL)
- App version display (from `expo-constants`: `Constants.expoConfig?.version`)
- Delete Account option (opens email to info@diedericksdobermanns.com with subject "Account Deletion Request")

---

## PHASE 5 — App Store Connect Setup

### Task 5.1 — Build for TestFlight

Run the production EAS build:
```bash
eas build --platform ios --profile production
```

This will:
- Increment the build number automatically (appVersionSource: remote)
- Bundle all assets
- Sign with production certificate and provisioning profile
- Upload to App Store Connect

### Task 5.2 — Required App Store Connect Information

Prepare the following for App Store Connect listing:

**App Name:** Diedericks Dobermanns

**Subtitle (30 chars max):** Premium Dobermann Breeder App

**Description (4000 chars max):**
```
Diedericks Dobermanns is the official mobile platform for clients of one of South Africa's premier Dobermann breeding and training operations.

Explore available puppies and expected litters, submit your application, and track your reservation — all in one place. Our premium client experience brings you closer to your dog from day one.

CLIENT FEATURES
• Browse available puppies with full pedigree, health, and temperament information
• View expected litters and join waiting lists
• Submit your client application and upload required documents
• Track your puppy reservation and stay updated on development
• Manage training bookings and view session progress
• Access our curated training video library

TRAINING LIBRARY
Stream professional training content including puppy development curricula, obedience work, protection foundations, socialisation guides, and our full weekly curriculum from Week 8 through Week 52 — based on IGP/Schutzhund principles.

ABOUT DIEDERICKS DOBERMANNS
We produce elite Dobermanns bred for intelligence, drive, loyalty, and temperament. Our breeding programme combines top international bloodlines with rigorous health testing and structured early development.

Every dog we produce is a reflection of our commitment to the breed. This app is a reflection of our commitment to you.
```

**Keywords (100 chars):** dobermann,doberman,puppy,breeder,training,dog,south africa,pedigree,protection,PSA

**Category:** Lifestyle (primary), Pets (secondary)

**Age Rating:** 4+ (no objectionable content)

**Privacy Policy URL:** https://www.diedericksdobermanns.com/privacy-policy

**Support URL:** https://www.diedericksdobermanns.com/contact

**Marketing URL:** https://www.diedericksdobermanns.com

### Task 5.3 — Screenshots Required

Apple requires screenshots in these sizes (prepare 3–5 screenshots per size):

| Device | Size |
|--------|------|
| iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max) | 1290 × 2796 px |
| iPhone 6.5" (iPhone 11 Pro Max, 12 Pro Max) | 1242 × 2688 px |
| iPhone 5.5" (iPhone 8 Plus) | 1242 × 2208 px |

Recommended screenshot sequence:
1. Home/Welcome screen
2. Available Puppies listing
3. Puppy detail with photos
4. Training booking screen
5. Training video library

Use Expo's simulator or a real device. Capture via `xcrun simctl io booted screenshot screenshot.png` for simulator screenshots, or directly on device.

### Task 5.4 — Export Compliance

In App Store Connect, you will be asked about encryption:
- Does your app use encryption? → **YES** (HTTPS, Expo SecureStore, Supabase TLS)
- Is it exempt from US export regulations? → **YES** (uses standard HTTPS/TLS only, which is exempt under EAR)
- Select: "My app uses encryption" + "Qualifies for exemption" (uses standard encryption)

Add to `app.json` under `ios`:
```json
"ITSAppUsesNonExemptEncryption": false
```

This signals to Apple that the app uses only standard HTTPS encryption and is exempt from encryption export regulations.

---

## PHASE 6 — Google Play Setup (Android)

### Task 6.1 — Build Android Production

```bash
eas build --platform android --profile production
```

### Task 6.2 — Google Play Console

Required for Play Store:
- **App name:** Diedericks Dobermanns
- **Short description (80 chars):** Premium Dobermann breeding & training client platform
- **Full description:** Same as App Store description above
- **Category:** Lifestyle
- **Content rating:** Complete questionnaire (will result in "Everyone" rating)
- **Privacy policy URL:** https://www.diedericksdobermanns.com/privacy-policy
- **Target API level:** 34 (required for 2024 submissions)

Screenshots required:
- Phone: minimum 2 screenshots (1080 × 1920 recommended)
- 512 × 512 app icon (already in assets/)
- 1024 × 500 feature graphic (create branded banner)

---

## PHASE 7 — OTA Updates (Post-Launch)

### Task 7.1 — Configure EAS Update

After initial submission, UI/logic changes can be pushed without a new build using EAS Update (OTA):

```bash
eas update --branch production --message "Fix: [description]"
```

This bypasses App Store review for JavaScript/TypeScript changes. Native changes (new permissions, new native modules) always require a full build + App Store submission.

---

## DO NOT DO

- Do NOT put the Supabase service role key in any client-side variable
- Do NOT skip the PrivacyInfo.xcprivacy file — Apple will reject builds that use required APIs without it
- Do NOT submit with test data in the database (admin-visible demo puppies, test users)
- Do NOT use `console.log` to output JWT tokens or user PII
- Do NOT hardcode the version number in `app.json` if `appVersionSource: "remote"` is set in eas.json

---

## Testing Checklist Before Submission

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Sign up flow works on real device (not simulator) — iOS and Android
- [ ] Password reset email arrives and deep link returns to app
- [ ] All photo permissions prompt correctly with the right permission strings
- [ ] Push notifications deliver on iOS (requires physical device + production cert)
- [ ] Training video player shows "Coming soon" for locked content
- [ ] Admin panel is completely hidden from client-role users
- [ ] Payment account screen works without crashing
- [ ] All screens have loading and empty states
- [ ] App does not crash on cold start with no network
- [ ] Terms & Conditions link opens correctly
- [ ] Privacy Policy link opens correctly
- [ ] Delete account email flow works
- [ ] App version is visible in Settings

---

## Execution Order

1. Update app.json (Task 1.1)
2. Create PrivacyInfo.xcprivacy (Task 2.1)
3. Run security audit (Tasks 3.1–3.4)
4. Add legal screens (Tasks 4.1–4.2)
5. Build iOS production: `eas build --platform ios --profile production`
6. Submit to TestFlight and test with real devices for 3–5 days
7. Create App Store Connect listing (Task 5.2–5.4)
8. Build Android production
9. Submit both apps for review
10. Configure EAS Update for post-launch patches
