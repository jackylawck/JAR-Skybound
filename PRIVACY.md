# 🔒 隱私權政策與數據治理聲明 | Privacy Policy & Data Governance

**生效日期 / Effective Date:** August 28, 2026  
**專案名稱 / Project Name:** J.A.R. 衝上雲霄 | J.A.R. Skybound  
**架構設計 / Architecture:** 100% 純客戶端架構 (Zero-Server, Pure Client-Side PWA)

---

## 繁體中文版本 (Traditional Chinese Version)

### 1. 零個人資料收集原則 (Zero Personal Data Collection)
* **無遠端伺服器收集**：本模擬器完全在使用者瀏覽器本地端（Client-Side WebGL & Web Worker）運行，不設後端伺服器資料庫，不收集、不傳輸、不儲存任何個人識別資訊（PII）、IP 地址、裝置特徵碼或瀏覽歷史。
* **符合全球隱私法規**：
  * **歐盟通用數據保護條例 (GDPR)**：無涉及個人資料之跨國傳輸與處理。
  * **加州消費者隱私法 (CCPA/CPRA)**：不收集且絕不出售任何使用者數據。
  * **香港個人資料（私隱）條例 (Cap. 486 PDPO)**：完全遵循保障資料原則（Data Protection Principles）。

### 2. 飛行遙測記錄（ARINC-717 FDR）與本地儲存
* **FDR 數據本地化**：模擬器內建之 ARINC-717 飛行數據記錄器僅在瀏覽器本機記憶體（RAM）內進行採樣。
* **使用者完全主控**：點擊「導出 FDR 黑匣子 (CSV)」所生成之 CSV 檔案，係由瀏覽器端透過 `Blob` 物件直接於本地生成並下載至使用者硬碟，全程絕不經由任何第三方伺服器中轉。

### 3. 傳感器權限 (Sensors & Permissions)
* 行動裝置之重力加速度計與陀螺儀權限僅於使用者明示授權後，於本機即時計算視角姿態，計算完成即時釋放，絕無背景記錄或外傳行為。

---

## English Version

### 1. Zero-Telemetry & Client-Side Privacy
* **Zero Remote Data Collection**: J.A.R. Skybound executes 100% on the client-side browser via WebGL and Web Workers. There are no backend database services, no analytical trackers, and no transmission of Personally Identifiable Information (PII), IP addresses, or device fingerprints.
* **Global Regulatory Compliance**:
  * **EU General Data Protection Regulation (GDPR)**: Fully compliant; zero processing or cross-border transfer of personal data.
  * **California Consumer Privacy Act (CCPA/CPRA)**: No personal data is collected, stored, or monetized.
  * **Hong Kong Personal Data (Privacy) Ordinance (Cap. 486 PDPO)**: Compliant with all statutory Data Protection Principles.

### 2. ARINC-717 Flight Data Recorder (FDR) Handling
* **In-Memory Sampling**: Telemetry data recorded by the ARINC-717 subsystem resides strictly in volatile browser memory (RAM).
* **Direct Local Export**: CSV downloads are constructed directly in the browser utilizing standard `Blob` APIs and dispatched directly to local storage without intermediary external servers.

### 3. Device Sensor Governance
* Device orientation, accelerometer, and gyroscope accesses are strictly utilized for real-time local flight control processing upon explicit user consent and are never recorded or transmitted remotely.
