# Earth Soil ERP Android App

Expo React Native Android app for the Earth & Soil ERP backend hosted at:

```text
https://rsdcon.vercel.app/api
```

## Run

```bash
cd /Users/prodesign/Documents/APP/Android_Application
npm install
npm run android
```

Open the project in an Android emulator, or scan the Expo QR code with Expo Go on an Android phone.

Login:

```text
Phone: 9999999999
Password: init@123
```

The app supports the same role-based flows as the web app: admin, operator, and driver.

## Checks

```bash
npm run doctor
npx expo export --platform android --output-dir /private/tmp/earth-soil-android-export
```
