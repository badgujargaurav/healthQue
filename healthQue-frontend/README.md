# healthQue Frontend

This is a minimal Expo-based React Native app containing a login screen.

Quick start

1. Change to the frontend folder:

```powershell
cd "D:\My Projects\healthQue\healthQue-frontend"
```

2. Install dependencies:

```powershell
npm install
```

3. Start the app (Expo):

```powershell
npm start
```

Open on a device or simulator using the Expo dev tools.

Additional setup

Install native helpers required by React Navigation and AsyncStorage (run from the same folder):

```powershell
expo install react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/native-stack
```

Then run:

```powershell
npm start
```

Profile fetching

The Settings screen fetches profile data from a placeholder API by default (`https://jsonplaceholder.typicode.com/users/1`). Replace `PROFILE_API` in `src/screens/SettingsScreen.js` with your real backend endpoint that returns profile data.

Features added

- Settings screen with profile info and Logout button
- Settings route available when signed-in

