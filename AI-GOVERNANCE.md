# 🤖 人工智能治理、可解釋性與 ISO/IEC 42001 聲明
# AI Governance, Explainability & ISO/IEC 42001 Compliance Framework

**標準參考 / Framework Standards:** ISO/IEC 42001:2023 (AIMS), EU AI Act (Regulation EU 2024/1689), NIST AI 100-1 (AI RMF), IEEE 7000 Series  
**生效日期 / Effective Date:** August 28, 2026  
**專案名稱 / Project Name:** J.A.R. 衝上雲霄 | J.A.R. Skybound  

---

## 繁體中文版本 (Traditional Chinese Version)

### 1. 系統架構分類與 AI 定義排除 (System Classification & Non-AI Exclusion)
依據 **歐盟人工智能法案（EU AI Act）第 3 條** 及 **ISO/IEC 22989:2022** 對「人工智能系統」之定義，本專案聲明如下：
* **確定性數值系統 (Deterministic Numerical Mechanics)**：本模擬器核心架構完全基於古典牛頓－歐拉剛體運動學（6-DoF）、四階龍格－庫塔法（RK4）及古典反饋控制理論（PID）。
* **無黑箱模型 (Zero Black-Box Models)**：系統內部**完全不包含**深度神經網絡（DNN）、強化學習（RL Policy）、大型語言模型（LLM）或未經形式化驗證之自適應權重矩陣。
* **靜態查表與可微分插值**：氣動力學計算（NASA CRM）採用雙線性網格插值（Bilinear Grid Interpolation），所有輸出與輸入具備 100% 數學確定性與重複再現性（Deterministic Reproducibility）。

---

### 2. ISO/IEC 42001:2023 人工智能管理體系 (AIMS) 對照表

本專案遵循 ISO/IEC 42001 標準原則進行軟體工程治理：

| ISO/IEC 42001 治理維度 | J.A.R. Skybound 實現機制與技術措施 | 合規狀態 |
| :--- | :--- | :--- |
| **透明度與可解釋性 (Transparency & Explainability)** | 物理引擎與飛控 PID 源代碼 100% 開源，輸入 $\to$ 狀態 $\to$ 輸出鏈條完全具備數學白箱可解釋性。 | ✅ 完全合規 (Fully Compliant) |
| **可追溯性與審計 (Traceability & Auditing)** | 內建 **ARINC-717 飛行數據記錄器 (FDR)**，以 20 Hz 完整取樣記錄 20+ 關鍵飛行參數，支援匯出 CSV 作形式化驗證。 | ✅ 完全合規 (Fully Compliant) |
| **穩健性與確定性 (Robustness & Determinism)** | 物理迴路運行於獨立 Web Worker，以固定 120 Hz 步長推進，徹底隔離 UI 渲染抖動，避免數值奇異點。 | ✅ 完全合規 (Fully Compliant) |
| **人機協同與控制 (Human-in-the-Loop, HITL)** | 具備 **控制盤接管 (CWS) 與手動死區偵測**：飛行員隨時可透過物理操作強制覆蓋或中斷自動駕駛（A/P）。 | ✅ 完全合規 (Fully Compliant) |
| **數據隱私與治理 (Data Governance & Privacy)** | 零伺服器架構（Zero-Server），無遠端遙測外傳，無使用者資料訓練行為，徹底規避模型偏見與資料投毒風險。 | ✅ 完全合規 (Fully Compliant) |

---

### 3. 演算法安全邊界與失效防護 (Safety Boundaries & Failsafe)
1. **輸入白名單與強型態約束**：Worker 通訊採用嚴格的數值過濾與邊界截斷（Clamping: $[-1, 1]$），杜絕非預期輸入造成系統崩潰。
2. **四元數流形投影 (Manifold Projection)**：姿態四元數於每步積分後強制歸一化（$\|q\| = 1$），在數學層面徹底根除數值漂移與除以零錯誤。
3. **電傳防護限制 (Flight Envelope Protection)**：學員模式具備攻角限制與自動改平補償，防止進入不可逆失速。

---

## English Version

### 1. System Classification & Scope Exclusion (EU AI Act & ISO/IEC 22989)
Pursuant to **Article 3 of Regulation (EU) 2024/1689 (EU AI Act)** and **ISO/IEC 22989:2022**, the J.A.R. Skybound project formally establishes:
* **Deterministic Mechanics**: The flight physics core is governed exclusively by classical Newton-Euler 6-DoF rigid-body equations, RK4 numerical integration, and deterministic PID control algorithms.
* **Absence of Autonomous Black-Box Models**: The architecture contains **no deep neural networks (DNN)**, reinforcement learning agents, stochastic generative models, or non-deterministic optimization heuristics.
* **Mathematical Verifiability**: Aerodynamic coefficients are extracted via deterministic bilinear interpolation over open wind-tunnel lookup tables (NASA CRM), guaranteeing exact mathematical explainability ($f(x) \to y$).

---

### 2. ISO/IEC 42001:2023 Alignment Matrix

| Governance Dimension | Technical Implementation & Verification in Skybound | Compliance Status |
| :--- | :--- | :--- |
| **Transparency & Explainability (XAI)** | White-box codebase; deterministic algebraic derivations for all control loops and state derivatives. | ✅ Fully Compliant |
| **Telemetry & Auditability** | Integrated **ARINC-717 Flight Data Recorder (FDR)** recording 20+ state parameters at 20 Hz for offline verification. | ✅ Fully Compliant |
| **Robustness & Determinism** | 120 Hz fixed-timestep physics thread isolated in Web Workers; zero garbage collection (Zero-GC) during cruise loop. | ✅ Fully Compliant |
| **Human-in-the-Loop (HITL)** | Instant Control Wheel Steering (CWS) override: manual pilot input immediately supersedes active autopilot modes. | ✅ Fully Compliant |
| **Data Governance & Integrity** | Zero-server, zero-telemetry client execution; immune to training data poisoning, bias, or model drift. | ✅ Fully Compliant |

---

### 3. Algorithmic Guardrails & Safety Envelope
* **Input Sanitization**: Numerical clamping on all control vectors to prevent buffer exploitation or numerical overflow.
* **SO(3) Normalization**: Sub-step quaternion renormalization eliminating gimbal lock and state divergence.
* **Flight Envelope Protection**: Fly-By-Wire Alpha protection and bank-angle limiting in Cadet mode to enforce flight safety envelopes.
