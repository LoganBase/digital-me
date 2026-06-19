# DigitalMe — E2E Test Infrastructure & Philosophy

This document outlines the testing strategy, architecture, and standards for the DigitalMe Sovereignty Dashboard.

## 1. Test Philosophy
DigitalMe is designed to be a highly resilient, single-page application representing a user's digital self-model. Because the core user is the sole owner of their data (Self-Sovereign Identity), the UI must be robust across all deployment settings.
Our E2E testing philosophy centers on **zero-dependency, air-gapped correctness**:
*   **Zero External Dependencies**: The test runner must execute without fetching external Node modules, ensuring it works inside restrictive CI environments and CODE_ONLY network scopes.
*   **Behavioral Verification**: We test user flows, state transitions, search filtration, and multi-tab state interactions rather than raw markup.
*   **Dual Static-Dynamic Verification**: The test suite runs real simulations of UI states while parsing actual source files (`index.html`, `src/App.jsx`, configurations) to ensure that the code matches the mock specifications.

---

## 2. Tested Features
The test suite covers the 4 core features of the DigitalMe dashboard:
1.  **F1: Interactive Dashboard (Core & Domains)**: Navigating active tabs, home page quote and cards representation, orbital SVG node clicking, detailed domain views, and the shared data bus.
2.  **F2: Holy Trinity Data Sources**: Verification of the Perception, Agent Feedback, and Hard Data data tree and source mappings.
3.  **F3: Core Principles Explorer**: Ten Founding Principles rendering, filtering by category/number, case-insensitive keyword searching, and implication tracking.
4.  **F4: Cloudflare Pages & Git Ready Architecture**: Configuration checks of `package.json`, `vite.config.js`, `tailwind.config.js`, and `postcss.config.js` to ensure the project compiles and routes properly.

---

## 3. Test Architecture
We implement a **4-tier test architecture** containing **49 tests** to ensure deep coverage:

### Tier 1: Feature Coverage (20 tests)
Verifies happy-path scenarios, ensuring all elements render and respond to basic click/input events under normal conditions.
*   *F1 (5 tests)*: Brand mounting, tab navigation, card clicks, quote display, and cards enumeration.
*   *F2 (5 tests)*: Data Sources header, three Trinity pillars, mapping grid existence, mapping cards, and source tags.
*   *F3 (5 tests)*: Principles header, list rendering, card IDs, thread navigation bar, and thread-item selectors.
*   *F4 (5 tests)*: Build/preview scripts, React plugins, content scans paths, postcss plugins, and dependencies.

### Tier 2: Boundary & Corner Cases (20 tests)
Verifies extreme inputs, rapid user behavior, responsiveness, and file-integrity boundaries.
*   *F1 (5 tests)*: Rapid tab switching history preservation, duplicate tab clicks, logo state resetting, mobile responsive style classes, and active indicators.
*   *F2 (5 tests)*: Empty query search fallback, unmatched query placeholders, case-insensitivity, domain number searches, and toggle-clearing filters.
*   *F3 (5 tests)*: Keyword-based principle filter, empty-string fallback, case-insensitivity, broad keyword matches, and single-card number restriction.
*   *F4 (5 tests)*: Mounting node verification, relative asset links, main.jsx entry matching, package.json dependencies validation, and custom font extensions.

### Tier 3: Cross-Feature Combinations (4 tests)
Tests the interaction of states across multiple tabs and features.
*   *Test 41 (F1 + F3)*: Search query preservation during home-tab navigation loop.
*   *Test 42 (F2 + F3)*: Search input state isolation between Data Sources and Principles tabs.
*   *Test 43 (F1 + F2)*: Domain selection focus coexisting with active Trinity data filters.
*   *Test 44 (F3 + F4)*: Alignment of hex colors used dynamically in principles card with Tailwind CSS file scanning.

### Tier 4: Real-World Workloads (5 tests)
Simulates end-to-end user stories representing a typical day-in-the-life auditing workflow.
*   *Test 45 (User Story 1)*: Searching for "wearable" tracking from the Fitness domain.
*   *Test 46 (User Story 2)*: Finding and validating the Lindy Effect principle under Sovereignty over Identity.
*   *Test 47 (User Story 3)*: Verifying configuration files and entrypoints for Cloudflare production deployment.
*   *Test 48 (User Story 4)*: Cross-domain review verifying autonomy impact scores and Critical Deficit alerts.
*   *Test 49 (User Story 5)*: Comprehensive walk-through clicking through all features and verifying Epistemic sub-agents.

---

## 4. Quality Thresholds
To ensure the highest standard of delivery:
*   **Pass Rate**: 100% pass rate is required.
*   **External Network Requests**: 0. The suite must remain air-gapped.
*   **Verification Speed**: The test runner must execute in `< 100ms`.
