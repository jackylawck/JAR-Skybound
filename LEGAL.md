# ⚖️ 法律聲明、合規性與出口管制條款 | Legal Notices, Compliance & Export Control

**生效日期 / Effective Date:** August 28, 2026  
**專案名稱 / Project Name:** J.A.R. 衝上雲霄 | J.A.R. Skybound  
**專案類型 / Project Classification:** 非商業開源科普與教學用飛行數值模擬器 (Non-Commercial, Open-Source Educational Flight Numerical Sandbox)

---

## 繁體中文版本 (Traditional Chinese Version)

### 1. 非官方與科普免責聲明 (Educational & Non-Commercial Disclaimer)
* **純粹教育與科普用途**：本專案係基於個人興趣及科普教育目的所開發之純前端 WebGL/JavaScript 物理模擬實驗室。所有空氣動力學模型（如 NASA CRM 網格、NACA 翼型公式）均取自已公開之非保密學術論文與公共領域文獻（如 NASA TM-2014-218179）。
* **非適航認證軟體**：本專案所包含之飛行力學、自動駕駛（PID 演算法）、FMS 導航及 ARINC-717 遙測記錄演算法**未獲得任何民航局（如 FAA、EASA、CAAC、CAD HK）之適航審定或飛行訓練器（FSTD）認證**。
* **嚴禁實機應用**：嚴禁將本專案代碼、公式、參數或衍生工具直接或間接應用於真實航空器操作、飛行員執照認證訓練、自動駕駛實機改裝或任何直接關係生命財產安全之關鍵任務系統（Mission-Critical Systems）。開發者對任何因不當使用所導致之損害概不承擔任何法律責任。

### 2. 國際出口管制與軍民兩用技術合規 (Export Control & Dual-Use Compliance)
* **公開開源技術（Publicly Available Technology）**：依據美國出口管制條例（EAR，15 C.F.R. § 734.3(b)(3)）及國際瓦聖納協定（Wassenaar Arrangement），本專案源代碼屬「公開獲取之大眾科研與教學軟體」，不包含任何受管制之專有軍用飛行控制律代碼、加密通訊模組或專利導引演算法。
* **非軍工武器載具**：本專案不具備超音速導彈彈道求解、雷達匿蹤模擬、武器掛載火控計算或軍事防禦對抗功能。
* **使用者自律義務**：使用者須自行確保其使用、分發或修改行為符合其所在司法管轄區之出口管制、軍民兩用貨物法規及制裁名單要求。

### 3. 全球 AI 法規與標準合規說明 (AI Regulations & ISO Compliance)
* **確定性數值物理系統（Deterministic Numerical System）**：本專案之 6-DoF 運動方程、RK4 數值積分、PID 反饋控制及導航邏輯**均由透明、可解釋之傳統古典數學與物理力學公式構成，不包含具自主學習能力之深度神經網絡、LLM 黑箱生成模型或自主決策代理（Autonomous AI Agents）**。
* **歐盟 AI 法案（EU AI Act）**：非高風險 AI 系統（Minimal/No Risk System），無透明度義務外之限制性 AI 監管限制。
* **ISO/IEC 42001 & ISO/IEC 25010**：代碼具備 100% 確定性與可追溯性，遵循軟體工程可驗證標準。

### 4. 智慧財產權與商標聲明 (Intellectual Property)
* 本軟體依據 **MIT License** 授權開源發布。
* 項目中所提及之真實航空術語、公開標準代碼（如 ARINC-717、ICAO、NASA）僅用於科普學術指代，相關註冊商標權益均歸原權利人所有。

---

## English Version

### 1. Educational & Non-Commercial Disclaimer
* **Purely for Science Education**: J.A.R. Skybound is an open-source, client-side WebGL physical sandbox engineered solely for educational, academic, and scientific visualization purposes. All aerodynamic formulations and wind-tunnel grids (e.g., NASA CRM) are compiled exclusively from open-access, publicly available academic literature (e.g., NASA TM-2014-218179).
* **Non-Certified Aviation Software**: The flight mechanics, autopilot algorithms (PID loops), FMS procedures, and ARINC-717 telemetry models **have not been certified or validated by any civil aviation authority (e.g., FAA, EASA, CAAC, HKCAD)** as a Flight Simulation Training Device (FSTD) or airworthy flight control software.
* **Prohibition of Real-World Deployment**: No part of this source code, mathematical model, or telemetry architecture may be utilized in real-world aircraft operations, pilot certification programs, fly-by-wire hardware integration, or safety-critical mission systems. The author disclaims all liability for any direct, indirect, incidental, or consequential damages resulting from unauthorized deployment.

### 2. Export Control & Dual-Use Technology Compliance
* **Public Domain Open-Source Software**: Pursuant to the United States Export Administration Regulations (EAR, 15 C.F.R. § 734.3(b)(3)) and the Wassenaar Arrangement on Dual-Use Goods and Technologies, this project constitutes publicly available, non-proprietary educational code and is exempt from specific export authorization requirements.
* **Non-Military Classification**: This repository contains no classified flight control laws, missile guidance algorithms, weapon system fire-control computing, or stealth signature estimation modules.
* **End-User Responsibility**: End users are solely responsible for ensuring that their downstream use, distribution, or fork of this repository complies with all applicable local and international export control regimes, sanctions, and regulations.

### 3. Artificial Intelligence & ISO Governance
* **Deterministic Mechanics**: All 6-DoF rigid-body physics, RK4 numerical integration, and autopilot controllers operate on deterministic mathematical equations. **No black-box neural networks, reinforcement learning policies, or autonomous generative AI components are integrated.**
* **EU AI Act & Global Frameworks**: Categorized as minimal/zero-risk software under the European Union AI Act.
* **Standards Alignment**: Architected with reference to ISO/IEC 25010 (Software Quality) and ISO/IEC 42001 (AI Governance - Deterministic Verification).

### 4. Trademarks and Open Source Licensing
* Distributed under the terms of the **MIT License**.
* All aviation standards, nomenclature, and organizational abbreviations (e.g., NASA, ARINC, ICAO) are referenced solely for technical and educational fidelity; all trademarks remain the property of their respective owners.
