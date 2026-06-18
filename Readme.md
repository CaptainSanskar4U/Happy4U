<div align="center">

# 🎉 Happy4U — Birthday Tracker

### Never Miss a Birthday Again! 🎂

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8.4-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

**A premium Progressive App, that tracks birthdays, sends smart reminders, and celebrates with you — all from your browser or Android device.**

[✨ Live Demo](https://happy4u.app) · [📦 Download APK](#-download-apk) · [🐛 Report Bug](https://github.com/CaptainSanskar4U/Happy4U/issues)

---

</div>

## 🔥 What is Happy4U?

Happy4U is a **beautiful, modern birthday tracker** that lives in your pocket. Add your friends' and family's birthdays, and the app will **magically remind you** — days before, on the day, or whenever you choose. With stunning dark/light themes, customizable accent colors, and an intuitive calendar view, tracking birthdays has never felt this good.

---

## ✨ Features

### 🎂 Core Birthday Management
- 📋 **Add & Track Birthdays** — Store names, dates, relationships, and custom emojis
- ⏳ **Smart Countdown** — See exactly how many days until the next birthday
- 🎯 **Relationship Tags** — Categorize as Friend, Family, Partner, Work, or Other
- 📅 **Calendar View** — Visual calendar showing all birthdays at a glance
- 🎉 **Birthday Popups** — Automatic celebration popups when it's someone's special day
- 📝 **Personal Notes** — Add notes for gift ideas, party plans, or special memories

### 🔔 Intelligent Notification System
- ⏰ **Multi-Offset Reminders** — Get reminded on the same day, 1 day, 3 days, or 7 days before
- 🕐 **Custom Reminder Times** — Set different notification times for each offset
- 🔕 **Per-Person Muting** — Mute specific reminder offsets globally or per birthday
- 📬 **Notification Inbox** — In-app notification center to review all past alerts
- 🔄 **Rolling Reconciliation** — Automatic background sync keeps reminders perfectly calibrated
- 📱 **Native Android Support** — Full local notifications via Capacitor on Android

### 🎨 Beautiful Customization
- 🌙 **Dark & Light Modes** — Easy on the eyes, day and night
- 🎨 **7 Accent Themes** — Neon Lime, Dopamine Orange, Zen Green, Cyber Blue, Royal Purple, Luxury Gold, Hot Pink
- 👤 **Profile Avatars** — Gender-based gradient avatars with initials
- ✨ **Smooth Animations** — Floating blobs, scale-in cards, and slide-up transitions

### 💾 Data & Privacy
- 🔒 **100% Offline-First** — Your data never leaves your device
- 💾 **IndexedDB Backup** — Persistent storage even when localStorage fails
- 📦 **Export/Import** — Full backup & restore with a single JSON file
- 🚫 **No Tracking** — Zero analytics, zero data collection

### 🧑‍💻 Power Features
- 🛠️ **Developer Mode** — Hidden diagnostic tools (tap version 7 times!)
- 📊 **Notification Telemetry** — View scheduled notifications and reconciliation stats
- 🦘 **Leap Year Handling** — Choose between Feb 28 or March 1 for Feb 29 birthdays
- 🔗 **Deep Linking** — Open specific birthdays directly from notification links

---

## 📸 Screenshots

<div align="center">

| 🏠 Home | 📅 Calendar | ⚙️ Settings |
|---------|------------|-------------|
| ![Home](https://via.placeholder.com/300x600/1a1a2e/D2F801?text=Home+Screen) | ![Calendar](https://via.placeholder.com/300x600/1a1a2e/3B82F6?text=Calendar+View) | ![Settings](https://via.placeholder.com/300x600/1a1a2e/A855F7?text=Settings) |

</div>

---

## 🚀 Quick Start

### 📋 Prerequisites

- **Node.js** 18+ — [Download](https://nodejs.org/)
- **npm** or **yarn**

### 🛠️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/CaptainSanskar4U/Happy4U.git

# 2. Navigate to the project
cd Happy4U

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

🌐 Open **http://localhost:5173** in your browser and start tracking birthdays!

---

## 📱 Download APK

Happy4U works as both a **PWA** and a **native Android app**:

1. Build the project: `npm run build`
2. Sync with Capacitor: `npx cap sync android`
3. Open in Android Studio: `npx cap open android`
4. Build the APK from Android Studio

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| ⚛️ **Frontend** | React 19 + TypeScript |
| ⚡ **Bundler** | Vite 6 |
| 📱 **Mobile** | Capacitor 8 (Android) |
| 🎨 **Icons** | Lucide React |
| 💾 **Storage** | localStorage + IndexedDB |
| 🔔 **Notifications** | Web Notifications API + Capacitor Local Notifications |
| 🔧 **Build** | Vite + TypeScript |

---

## 🎮 How It Works

### Adding a Birthday
1. Tap the big **"+ Add"** button on the home screen
2. Enter the person's **name**, **birthday**, and **relationship**
3. Pick a fun **emoji** and choose which **reminders** to enable
4. Hit save — Happy4U takes care of the rest!

### Notification Flow
```
┌─────────────────┐
│  7 Days Before  │──→ Early heads-up reminder
└─────────────────┘
┌─────────────────┐
│  3 Days Before  │──→ Time to plan gift/party
└─────────────────┘
┌─────────────────┐
│  1 Day Before   │──→ Don't forget tomorrow!
└─────────────────┘
┌─────────────────┐
│  On Birthday 🎂 │──→ Send your wishes!
└─────────────────┘
```

---

## 📂 Project Structure

```
Happy4U/
├── 📄 App.tsx                 # Main application component
├── 📄 types.ts               # TypeScript interfaces
├── 📄 index.tsx              # Entry point
├── 📄 vite.config.ts         # Vite configuration
├── 📄 capacitor.config.json  # Capacitor config
├── 📁 components/
│   ├── 🎂 AddBirthdayModal    # Birthday form modal
│   ├── 🎉 BirthdayPopup       # Celebration popup
│   ├── 📅 CalendarView        # Calendar display
│   ├── 🎊 Confetti            # Confetti animation
│   ├── 📝 NotesView           # Personal notes
│   ├── 📬 NotificationInbox   # Notification center
│   ├── 🔔 NotificationPerm    # Permission request modal
│   └── 👋 WelcomeModal        # First-time user onboarding
├── 📁 utils/
│   ├── 📅 dateUtils           # Date calculation helpers
│   ├── 💾 storage             # IndexedDB & localStorage sync
│   ├── 🔔 notifications       # Notification scheduling engine
│   └── 🔍 diagnostics         # Dev mode diagnostics
├── 📁 android/                # Capacitor Android project
└── 📁 public/                 # Static assets
```

---

## ⚙️ Configuration

### 🎨 Accent Themes

| Theme | Color | Vibe |
|-------|-------|------|
| 🟢 Neon Lime | `#D2F801` | Default — fresh & energetic |
| 🟠 Dopamine Orange | `#F3701E` | Warm & exciting |
| 🌿 Zen Green | `#22c55e` | Calm & natural |
| 🔵 Cyber Blue | `#3B82F6` | Cool & techy |
| 🟣 Royal Purple | `#A855F7` | Luxurious & bold |
| 🟡 Luxury Gold | `#EAB308` | Premium & elegant |
| 🩷 Hot Pink | `#EC4899` | Fun & vibrant |

### 🔔 Reminder Offsets

Each birthday can have custom reminders:
- **Same Day** — Birthday morning alert
- **1 Day Before** — Tomorrow reminder
- **3 Days Before** — Planning heads-up
- **7 Days Before** — Early reminder

All offsets can be **individually muted** in settings.

---

## 🧑‍💻 Developer Mode

Unlock hidden diagnostics:

1. Go to **Settings**
2. Tap the **version number** 7 times
3. View notification telemetry, reconciliation stats, and scheduled notifications

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. 🍴 Fork the repository
2. 🔀 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 📬 Open a Pull Request

---

## 📝 License

This project is open source. Feel free to use it! 🚀

---

## 🙏 Made With

Built with ❤️ by **Captain Sanskar**

> *"Because every birthday deserves to be remembered."* 🎂

---

<div align="center">

### ⭐ Star this repo if you love Happy4U!

![Visitors](https://api.visitorbadge.io/api/visitors?path=CaptainSanskar4U%2FHappy4U&countColor=%2337d67a&style=for-the-badge)

</div>
