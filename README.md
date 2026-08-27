# 🛩️ J.A.R. 衝上雲霄 Pro | JAR Skybound Pro

---

## 📖 關於本專案 (About This Project)

### 繁體中文

這是為了我和兒子共渡美好時光而打造的個人非商業飛行科普專案！我們希望在瀏覽器中親手重現一台飛行模擬器，讓孩子能在指尖操作中理解駕駛的奧妙。

誠邀所有朋友一同化身機長，體驗航空力學探索的樂趣！

### English

This project is a personal, non-commercial aviation science education endeavor created to share meaningful and inspiring time with my son. We set out to build a flight simulator to intuitively grasp the beauty of aerodynamics.

We warmly invite friends to take the captain's seat, and experience the pure joy of flight!

---

## 🌟 核心特色 (Key Features)

### 繁體中文

* **🛩️ 科研級 6-DoF 剛體運動學與高保真氣動 (Research-Grade 6-DoF Dynamics & Aerodynamics)**：
* **四元數全姿態積分 (Quaternion Attitude Dynamics)**：採用四元數微分方程與子步流形投影歸一化，徹底根絕歐拉角在 $\pm 90^\circ$ 俯仰時的萬向鎖奇異點。


* **NASA CRM 風洞網格插值 (NASA CRM Bilinear Lookup)**：採用 NASA TM-2014-218179 風洞實驗數據網格，精準還原非線性失速分離與跨音速波阻陡增特性。


* **四階龍格－庫塔固定時間步累加器 (RK4 Fixed-DT Accumulator)**：以 120 Hz 物理累加器驅動 RK4 積分，杜絕低幀率下的數值發散與螺旋死亡。


* **動態氣動模型熱切換 (Runtime Aero Model Hot-Swap)**：支援於 NASA CRM 實測網格與 NACA 解析模型間即時切換對比。




* **🔥 雙發非線性渦扇推進與單發失效力矩 (Dual Turbofan Engine & Asymmetric Thrust)**：
* **高低壓轉子熱慣性響應 (N1/N2 Rotor Dynamics)**：精確模擬轉子加速與減速一階滯後時間常數，動態計算排氣溫度（EGT）與燃油流量（FF）。


* **單發失效偏航力矩 (Engine Flameout & Yawing Moment)**：模擬單發停車後的風車阻力與不對稱推力偏航力矩，考驗飛行員單發飄降處置能力。




* **🛞 Pacejka '89 多輪起落架接地力學 (Pacejka Landing Gear & Ground Dynamics)**：
* **非線性彈簧－阻尼減震 (Soft-Contact Struts)**：三支柱獨立支撐，實現真實接地緩衝與重著陸過渡。


* **魔術公式輪胎側偏力 (Pacejka Lateral Slip)**：依據側向滑移角動態求解輪胎側偏力矩，呈現真實地面滑行與側風著陸特性。




* **🔬 ARINC-717 黑匣子與多通道動態示波器 (ARINC-717 FDR & Real-Time Oscilloscope)**：
* **ARINC-717 規範 20+ 全參數記錄**：以 20 Hz 採樣記錄姿態角、空速、動壓、舵面偏角、發動機轉速與自駕狀態字，一鍵導出標準 CSV 用於 MATLAB/Python 科學分析。


* **即時節流示波器 (On-Demand Telemetry Scope)**：主渲染幀按需繪製，支援在氣動姿態（$\alpha$ / $\theta$ / $N_z$）與動力性能（IAS / N1）通道間即時切換。


* **📟 全息 HUD、EICAS 與飛行管理系統 (Avionics, EICAS & FMS/Autopilot)**：
* **Canvas 2D 自適應 HUD**：整合姿態儀（ADI）、飛行路徑標記（FPM）、垂直剖面偏離指示（VDI）與高對比速度/高度刻度帶。


* **EICAS 發動機即時監控**：獨立儀表即時顯示雙發 N1、EGT 與燃油消耗。


* **LNAV / VNAV 飛控導航**：支援轉彎提前量解算、3° 幾何下滑道導引與駕駛盤接管（CWS）邏輯。





---

### English

* **🛩️ Research-Grade 6-DoF Dynamics & Aerodynamics**:
* **Quaternion Attitude Dynamics**: Employs quaternion differential equations with sub-step SO(3) manifold normalization, completely eliminating gimbal lock singularities at $\pm 90^\circ$ pitch.


* **NASA CRM Bilinear Grid Lookup**: Integrates wind-tunnel data (NASA TM-2014-218179) to reproduce nonlinear stall separation and transonic wave drag divergence.


* **RK4 Fixed-Timestep Accumulator**: Driven by a 120 Hz accumulator to maintain deterministic numerical stability across varying frame rates.


* **Runtime Aero Model Hot-Swap**: Enables instant switching between NASA CRM experimental grids and NACA analytical models.




* **🔥 Dual Turbofan Engines & Asymmetric Thrust Dynamics**:
* **N1/N2 Rotor Dynamics**: Simulates high/low-pressure rotor inertia lag, dynamic Exhaust Gas Temperature (EGT), and real-time Fuel Flow (FF).


* **Asymmetric Thrust Modeling**: Recreates windmilling drag and asymmetric yawing moments during single-engine flameout scenarios.




* **🛞 Pacejka '89 Landing Gear & Ground Dynamics**:
* **Nonlinear Spring-Damper Struts**: Multi-gear soft-contact formulation delivering realistic landing compression and rollout dynamics.


* **Magic Formula Cornering Forces**: Evaluates lateral tire slip angles and restoring forces for ground taxiing and crosswind alignment.




* **🔬 ARINC-717 Flight Data Recorder & Multi-Channel Oscilloscope**:
* **ARINC-717 Full Telemetry Logging**: 20 Hz recording of Euler angles, IAS, dynamic pressure, control deflections, N1, and AP mode words for CSV export to MATLAB/Python workflows.


* **Throttled Real-Time Oscilloscope**: On-demand rendering allowing instant mode toggling between Aerodynamic ($\alpha$ / $\theta$ / $N_z$) and Performance (IAS / N1) metrics.


* **📟 Holographic HUD, EICAS & Flight Management System (FMS)**:
* **Canvas 2D Adaptive HUD**: Renders Attitude Director Indicator (ADI), Flight Path Marker (FPM), Vertical Deviation Indicator (VDI), and speed/altitude tapes.


* **EICAS Real-Time Display**: Live monitoring of dual-engine N1, EGT, and total fuel flow.


* **LNAV / VNAV Coupled Autopilot**: Features lead-turn waypoint capture, 3° geometric descent profiling, and Control Wheel Steering (CWS) override.





---

## 🗂️ 模組架構 (Architecture)

```text
JAR-Skybound/
├── index.html            # 應用程式入口、PWA 配置、高資安 CSP、SEO 標籤與 HUD/EICAS 視圖
├── manifest.json         # PWA 行動裝置安裝設定檔 / PWA Manifest
├── LICENSE               # MIT 開源授權條款 / Open Source License
├── style.css             # 航電 HUD 樣式、EICAS 面板、示波器佈局與響應式 RWD / Stylesheet
├── config.js             # 全域標準物理常數 (UNITS)、發動機/飛控配置與多語言字典 / Global Config
├── physics.js            # 6-DOF Web Worker 物理核心 (RK4, 四元數, NASA CRM, Pacejka) / Physics Engine
├── main.js               # 主執行緒中樞、Three.js 渲染管線、ARINC-717 FDR 與輸入事件處理 / Main Controller
├── hud.js                # Canvas 2D Retina 抬頭顯示器 (ADI, FPM, VDI 濾波與刻度帶) / Avionics HUD
├── autopilot.js          # 自動駕駛三軸 PID 控制迴路 (ALT / HDG / SPD / CWS 接管) / Autopilot System
├── fms.js                # 飛行管理系統 (航路點循跡、LNAV 轉彎提前量與 3° VNAV 剖面) / FMS & VNAV
└── audio.js              # Web Audio API 程序化發動機音調、風切聲與語音告警引擎 / Sound Engine

```

---

## 🎮 控制指南 (Controls)

| 操作動作 (Action) | 電腦鍵盤 (Keyboard) | 觸控 / 滑鼠 (Touch / Mouse) |
| --- | --- | --- |
| **俯仰與滾轉 (Pitch & Roll)** | `↑` / `↓` 或 `W` / `S` (俯仰) <br>

<br> `←` / `→` 或 `A` / `D` (滾轉) | 右下方虛擬飛行搖桿拖曳 (Virtual Yoke) |
| **發動機油門推桿 (Throttle)** | 滑鼠拖曳左側推桿 | 滑動左側垂直油門推桿 (Vertical Slider) |
| **方向舵與剎車 (Rudder & Brake)** | `Q` (左舵) / `E` (右舵) <br>

<br> `Space` (剎車) | 點擊左下方 **◀** / **▶** 方向舵及 **BRK** 剎車鍵 |
| **自動駕駛模式切換 (Autopilot)** | 滑鼠點擊底部 MCP 面板按鈕 | 點擊底部 MCP 面板 (**A/P**, **LNAV**, **VNAV**) |
| **故障注入與黑匣子 (IOS / FDR)** | 滑鼠點擊右上角面板 | 點擊右上角 **左/右發停車** 或 **導出 FDR 黑匣子 (CSV)**<br> |
| **示波器通道切換 (Scope Mode)** | 滑鼠點擊示波器頂部按鈕 | 點擊左下方示波器 **切換通道** 或 **收起/展開** |

---

## 📜 授權條款 (License)

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 授權開源。歡迎學術研究者、航空教育工作者與飛行愛好者自由使用、修改、擴充與引用！

This project is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT). Researchers, educators, and flight simulation enthusiasts are warmly invited to utilize, extend, and cite this platform.
