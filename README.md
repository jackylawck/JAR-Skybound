# 🛩️ J.A.R. 衝上雲霄 | J.A.R. Skybound
> **High-Fidelity 6-DoF WebGL Flight Simulator & Glass Cockpit Avionics System**  
> An open-source, zero-asset, scientific-grade browser flight sandbox powered by Three.js, Web Audio API, and NASA CRM transonic aerodynamics.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-green.svg)]()
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple.svg)]()
[![Physics: 120Hz Worker](https://img.shields.io/badge/Physics-120Hz%20Worker-orange.svg)]()

---

## 📖 關於本專案 (About This Project)

### 繁體中文

這是為了我和兒子共渡美好時光而打造的個人非商業飛行科普專案！我們希望在瀏覽器中親手重現一台飛行模擬器，讓孩子能在指尖操作中感受航空工程的奧妙。

誠邀所有飛行愛好者一同化身機長，體驗衝上雲霄的純粹樂趣！

### English

This project is a personal, non-commercial aviation science education endeavor created to share meaningful and inspiring moments with my son. We set out to build a high-fidelity flight simulator in pure code, allowing anyone to intuitively grasp the beauty of aerodynamics and flight mechanics.

We warmly invite all aviation enthusiasts to take the captain's seat and experience the pure joy of flight!

---

## 🌟 核心特色 (Key Features)

### 繁體中文

* **🛩️ 科研級 6-DoF 剛體運動學與高保真氣動 (Research-Grade 6-DoF Dynamics & Aerodynamics)**：
  * **四元數全姿態微分 (Quaternion Dynamics)**：採用四元數微分方程與子步流形投影歸一化，徹底根絕歐拉角在 $\pm 90^\circ$ 俯仰時的萬向鎖奇異點。
  * **NASA CRM 風洞網格插值 (NASA CRM Transonic Grid)**：採用 NASA TM-2014-218179 風洞實驗數據網格，精準還原攻角（$\alpha: -4^\circ \sim +22^\circ$）與馬赫數（$M: 0.20 \sim 0.86$）非線性失速分離與跨音速波阻陡增特性。
  * **四階龍格－庫塔固定時間步累加器 (RK4 Fixed-DT Accumulator)**：以 120 Hz 物理累加器驅動 RK4 數值積分，杜絕低幀率下的數值發散。
  * **電傳防墜與失速防護 (Fly-By-Wire Alpha Protection)**：學員模式具備轉彎自動補足垂直升力、最大傾角限制與自動改平阻尼；自動駕駛（A/P）具備大角度俯衝強制拉起自救邏輯。

* **🔥 雙發非線性渦扇推進與單發失效力矩 (Dual Turbofan Engines & Asymmetric Thrust)**：
  * **高低壓轉子熱慣性響應 (N1/N2 Rotor Dynamics)**：精確模擬轉子加速與減速一階滯後時間常數，動態計算排氣溫度（EGT）與燃油流量（FF）。
  * **單發失效偏航力矩 (Engine Flameout & Yawing Moment)**：模擬單發停車後的風車阻力與不對稱推力偏航力矩，考驗飛行員單發飄降處置能力。

* **🛞 Pacejka '89 多輪起落架接地力學 (Pacejka Landing Gear Dynamics)**：
  * **非線性彈簧－阻尼減震 (Soft-Contact Struts)**：三支柱獨立支撐，實現真實接地緩衝、重著陸過渡與地面煞車滑移。
  * **魔術公式輪胎側偏力 (Pacejka Lateral Slip)**：依據側向滑移角動態求解輪胎側偏力矩，呈現真實地面滑行與側風降落特性。

* **🌌 次世代物理視覺管線 (Mastery Environment & Shaders)**：
  * **Rayleigh 大氣散射天穹**：物理梯度漸變天空，支援日間晴空、黃昏日落、夜航月光微光與暴風雨等四種環境模式。
  * **動態鏡面水體與遠山山脊**：Phong 水面高光反光與程序化山巒輪廓線，打破單調平坦地平線。
  * **ICAO 規範跑道與機場地景**：包含接地帶標線、跑道號碼、滑行道、塔台機庫群及 Additive 發光跑道燈。
  * **物理視角 PAPI 盲降燈**：3° 幾何下滑道視角即時切換紅/白燈組合，提供高保真目視進近引導。

* **📱 航空級玻璃座艙與黑匣子 (Glass Cockpit, Avionics & ARINC-717)**：
  * **自適應響應式 HUD (Mobile-First Canvas 2D)**：整合 ADI 姿態儀、FPM 速度向量、VDI 垂直引導稜形、極限貼邊高度/速度帶與防數值堆疊滾動。
  * **100% 完整雙語即時切換**：繁體中文與 English 儀表一鍵無縫切換。
  * **ARINC-717 規範 20+ 全參數黑匣子**：以 20 Hz 記錄姿態角、空速、動壓、舵面偏角、發動機轉速與自駕狀態字，一鍵導出標準 CSV 用於 MATLAB/Python 科學分析。
  * **即時節流示波器 (On-Demand Telemetry Scope)**：支援在氣動姿態（$\alpha$ / $\theta$ / $N_z$）與動力性能（IAS / N1）通道間即時切換。

---

### English

* **🛩️ Research-Grade 6-DoF Dynamics & Aerodynamics**:
  * **Quaternion Attitude Dynamics**: Employs quaternion differential equations with sub-step SO(3) manifold normalization, completely eliminating gimbal lock singularities at $\pm 90^\circ$ pitch.
  * **NASA CRM Bilinear Grid Lookup**: Integrates wind-tunnel data (NASA TM-2014-218179) across $\alpha \in [-4^\circ, 22^\circ]$ and $M \in [0.20, 0.86]$ to reproduce nonlinear stall separation and transonic wave drag divergence.
  * **RK4 Fixed-Timestep Accumulator**: Driven by a dedicated 120 Hz Web Worker accumulator to maintain deterministic numerical stability.
  * **Fly-By-Wire Stability & Stall Protection**: Features automated bank-angle lift compensation, auto-leveling damping in Cadet mode, and emergency level recovery logic for the Autopilot.

* **🔥 Dual Turbofan Engines & Asymmetric Thrust Dynamics**:
  * **N1/N2 Rotor Dynamics**: Simulates high/low-pressure rotor inertia lag, dynamic Exhaust Gas Temperature (EGT), and real-time Fuel Flow (FF).
  * **Asymmetric Thrust Modeling**: Recreates windmilling drag and asymmetric yawing moments during single-engine flameout scenarios.

* **🛞 Pacejka '89 Landing Gear & Ground Dynamics**:
  * **Nonlinear Spring-Damper Struts**: Multi-gear soft-contact formulation delivering realistic landing compression, braking, and rollout dynamics.
  * **Magic Formula Cornering Forces**: Evaluates lateral tire slip angles and restoring forces for ground taxiing and crosswind alignment.

* **🌌 Mastery Procedural Atmosphere & Scenery**:
  * **Rayleigh Atmospheric Scattering Dome**: GPU shader gradient dome supporting Day Clear, Sunset, Night IFR, and Storm presets with adaptive ambient lighting.
  * **Dynamic Specular Ocean & Mountain Ridgelines**: Phong specular water reflectance paired with distant procedural mountain silhouettes.
  * **ICAO Standard Runway Infrastructure**: Features touchdown zone markings, threshold identifiers, taxiways, tower/terminal complexes, and additive beacon arrays.
  * **Geometric PAPI Glideslope**: Dynamic 3° approach slope lights switching between red and white based on true aircraft sightline geometry.

* **📱 Glass Cockpit Avionics & Telemetry**:
  * **Adaptive Mobile-First HUD**: Canvas 2D Primary Flight Display featuring ADI, Flight Path Marker (FPM), VDI diamond, edge-aligned speed/altitude tapes, and anti-overlap clipping.
  * **100% Complete Bilingual UI**: Instant runtime switching between Traditional Chinese and English.
  * **ARINC-717 Flight Data Recorder (FDR)**: 20 Hz recording of 20+ flight parameters with one-click CSV export for MATLAB/Python data science analysis.
  * **Dual-Channel Oscilloscope**: On-demand telemetry plotting toggling between Aerodynamic ($\alpha$ / $\theta$ / $N_z$) and Propulsion (IAS / N1) streams.

---

## 🗂️ 模組架構 (Architecture)

```text
JAR-Skybound/
├── index.html               # 應用程式入口、PWA 配置、高資安 CSP、SEO 標籤與 Glass Cockpit 佈局
├── manifest.json            # PWA 行動裝置安裝設定檔 / PWA Manifest
├── LICENSE                  # MIT 開源授權條款 / Open Source License
├── style.css                # 玻璃座艙樣式表 (Glass Cockpit Tokens, 抽屜式佈局, 響應式 RWD)
├── config.js                # 全域標準物理常數 (UNITS)、飛機氣動配置與 100% 雙語字典 / Global Config
├── physics.js               # 6-DOF Web Worker 物理核心 (RK4, 四元數, NASA CRM, Pacejka, 自動改平)
├── main.js                  # 主執行緒中樞、Three.js 渲染管線、ARINC-717 FDR 與輸入事件處理
├── hud.js                   # Canvas 2D 響應式抬頭顯示器 (ADI, FPM, VDI 濾波, 貼邊刻度帶, 環境調光)
├── autopilot.js             # 自動駕駛三軸 PID 控制迴路 (ALT / HDG / SPD / CWS 接管 / Level Recovery)
├── fms.js                   # 飛行管理系統 (航路點循跡、LNAV 轉彎提前量與 3° VNAV 剖面)
├── audio.js                 # Web Audio API 程序化發動機音調、風切聲與語音告警引擎 / Sound Engine
├── jarSkybound192icon.png   # 192px PWA 圖標
└── jarSkybound512icon.png   # 512px PWA 圖標

```

---

## 🎮 控制指南 (Flight Controls)

| 操作動作 (Action) | 電腦鍵盤 (Keyboard) | 觸控 / 滑鼠 (Touch / Mobile) |
| --- | --- | --- |
| **俯仰與滾轉 (Pitch & Roll)** | `↑` / `↓` 或 `W` / `S` (俯仰) <br>

<br> `←` / `→` 或 `A` / `D` (滾轉) | 右下方虛擬搖桿 上推(低頭)/下拉(抬頭)/左右推(滾轉) |
| **發動機油門推桿 (Throttle)** | 滑鼠拖曳左側推桿 | 滑動左側垂直油門推桿 (0% ~ 100%) |
| **方向舵與剎車 (Rudder & Brake)** | `Q` (左舵) / `E` (右舵) <br>

<br> `Space` (剎車) | 點擊左下方 **◀** / **▶** 方向舵及 **BRK** 剎車鍵 |
| **自動駕駛模式 (Autopilot)** | 點擊底部 MCP 面板按鈕 | 點擊底部 MCP 面板 (**A/P**, **LNAV**, **VNAV**) |
| **儀表 / 故障注入 (Avionics & IOS)** | 點擊右上角 `📊` 按鈕 | 點擊右上角 **`📊 AVIONICS / IOS`** 展開滑出式抽屜 |
| **返回主選單 (Return Menu)** | 點擊左上角 `🏠` 按鈕 | 點擊左上角 **`🏠 MENU / 選單`** 返回首頁設定模式 |
| **墜毀一鍵重啟 (Respawn)** | 點擊彈窗重新起飛按鈕 | 點擊墜毀結算彈窗 **`🔄 重新起飛 (RESPAWN)`** |

---

## 📜 授權條款 (License)

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 授權開源。歡迎學術研究者、航空教育工作者與飛行愛好者自由使用、修改、擴充與引用！

This project is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT). Researchers, educators, and flight simulation enthusiasts are warmly invited to utilize, extend, and cite this platform.
