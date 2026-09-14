# 跨平台常駐與原生打包實作指引 (Platform Guide)

本文件詳細說明如何將既有的 Web 核心計薪時鐘封裝為 **Windows 原生桌面懸浮** 與 **Android 系統通知欄常駐應用**。

---

## 🖥️ 1. Windows 端：原生無邊框、背景穿透與滑鼠穿透懸浮 (Tauri v2)

使用 [Tauri](https://v2.tauri.app/) 能夠以極小體積（< 10MB，遠小於 Electron 的 80MB+）包裝我們的 Web 前端程式，並直接呼叫 Windows 原生 Win32 API 達到 Python Tkinter 原版的所有懸浮效果。

### 1.1 Tauri 視窗組態 (`tauri.conf.json`)

在 `src-tauri/tauri.conf.json` 中配置主視窗屬性：

```json
{
  "app": {
    "windows": [
      {
        "title": "薪資時鐘",
        "width": 340,
        "height": 130,
        "resizable": false,
        "decorations": false,        // 移除 Windows 視窗標題列與邊框
        "transparent": true,        // 視窗背景穿透透明
        "alwaysOnTop": true,        // 視窗永遠置頂
        "skipTaskbar": true         // 不佔用工作列圖示，常駐於系統匣 (Tray)
      }
    ],
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "tooltip": "薪資時鐘 (常駐中)"
    }
  }
}
```

### 1.2 滑鼠穿透模式 (Click-through) 實作 (Rust 核心)

若使用者切換為「穿透懸浮模式」，可在 Rust 端透過 `tauri::WebviewWindow` 調用：

```rust
// 啟用滑鼠穿透（點擊事件直接穿透至下層桌面或應用程式）
window.set_ignore_cursor_events(true)?;

// 恢復正常點擊與拖曳
window.set_ignore_cursor_events(false)?;
```

### 1.3 視窗拖曳與座標記憶

- 前端在元素上加上 `data-tauri-drag-region` 屬性即可支援滑鼠隨處按住拖曳。
- 關閉或移動時，透過 `@tauri-apps/plugin-window-state` 自動記錄 `(X, Y)` 座標，下次啟動自動恢復位置。

---

## 📱 2. Android 端：系統前景常駐通知 (Foreground Service)

在 Android 系統中，若要確保時間時鐘能在背景穩定跳動而不被系統休眠或工作管理員殺死，必須透過 **Foreground Service（前景服務）** 搭配持續性通知 (Ongoing Notification)。

可搭配 **Capacitor** 或原生 **Kotlin** 模組封裝：

### 2.1 AndroidManifest.xml 權限設定

```xml
<manifest ...>
    <!-- Android 13+ 必須動態請求通知權限 -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- 前景服務權限 -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    
    <!-- 開機自動啟動常駐 (可選) -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <!-- 電池最佳化白名單請求 -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
</manifest>
```

### 2.2 前景通知設定關鍵重點 (Kotlin / Java 概念)

```kotlin
// 1. 建立低干擾 Notification Channel（避免每秒發出逼逼聲）
val channel = NotificationChannel(
    "salary_clock_channel",
    "薪資累積通知",
    NotificationManager.IMPORTANCE_LOW // 關鍵：設為 LOW 確保靜音不彈窗打擾
).apply {
    description = "持續顯示當日工時薪資累積進度"
    setShowBadge(false)
}
notificationManager.createNotificationChannel(channel)

// 2. 建立常駐 Notification
val notification = NotificationCompat.Builder(context, "salary_clock_channel")
    .setSmallIcon(R.drawable.ic_salary_coin)
    .setContentTitle("今日累積：NT$ 1,245.80")
    .setContentText("努力工作中 💼 | 離下班還有 2 小時 15 分")
    .setOngoing(true)                    // 設為持續性，使用者無法左滑清除
    .setOnlyAlertOnce(true)              // 關鍵：更新文字時不重複震動或發聲
    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE) // 鎖定螢幕時自動隱藏敏感金額
    .setProgress(100, 65, false)         // 在通知欄直接顯示進度條
    .build()

startForeground(NOTIFICATION_ID, notification)
```

### 2.3 智慧動態刷新機制

- **上班時段內**：以每秒（或自訂每 5 秒 / 1 分鐘）更新一次通知文字與進度條。
- **午休與下班時段**：自動暫停計時迴圈，停止頻繁更新通知，大幅節省手機電量。

---

## 🌐 3. Web 端：免安裝桌面置頂 (Document Picture-in-Picture)

現代 Chromium 核心（Google Chrome / Microsoft Edge）原生支援 `Document Picture-in-Picture API`：

- **啟動方式**：使用者只需進入網頁版，點擊頂部的「📌 桌面懸浮」按鈕。
- **效果**：瀏覽器直接在 Windows 桌面角落彈出獨立置頂視窗（Always-on-top）。
- **同步**：主頁面之跳動金額、每秒收益率、防窺模式等皆即時同步至置頂小視窗中，免安裝任何桌面軟體即可享有極佳的辦公置頂體驗。
