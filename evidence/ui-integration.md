# UI integration verification — 14/11/2026

Cloned `https://github.com/nguyenducthanh265/TEAM-5SS.git`, baseline `183b319`. Integrated the approved moss/lime/ivory design as React Native components, not a WebView. Backend/provider code, queue, session and persistent storage implementations retained.

| Check | Result |
|---|---|
| Existing mobile baseline before presentation helpers | 7 suites / 53 tests PASS |
| New presentation tests first run | RED: missing presentation module |
| Final Jest | 8 suites / 59 tests PASS |
| TypeScript `tsc --noEmit` | PASS |
| Backend classifier/API/groups tests | 53 PASS |
| Build/smoke gate tests | 10 PASS |
| `check_rules.py ... --scan-src app/src` | RESULT: PASS |
| Actual Expo web browser flow | 11 checks PASS; `evidence/native-ui/browser-tests.txt` |
| Expo web export | PASS, `.cache/ui-web` |
| Android Hermes export | PASS, 1,871 modules, `.cache/ui-android` |
| Local backend `/health` | HTTP200, system `examples.waste_classifier:run`, port8001 |
| Local exported UI | HTTP200, http://localhost:8792 |

Browser checks cover real component rendering, zero initial progress, visible scan action, guide search without accents, rule sheet, stage preview without point mutation, empty history, sample isolation, camera permission screen/exit, and mobile overflow. Six screenshots were captured and inspected in `evidence/native-ui/`.

Fresh reviewer checked native UI and new helpers/dev tools. Fixed shutter icon contrast and large-font review header overflow. SDK58 types required the current tab emitter/navigateToTab API and explicit absolute positioning. No outstanding important reviewer findings.

Dependency setup: downloaded verified portable Node24 into parent workspace `.tools/`; corrected incomplete npm lock peer resolution and added SDK-matched SVG/web packages. Three large Expo archives required direct downloads verified against lockfile SHA512 and cached locally after repeated connection resets. Dependency/runtime downloads are not application source.

User chose local verification and confirmed no deployed backend URL. No live provider/vision request, APK build/install, camera hardware check or two-device demo was claimed. Android export is a Hermes bundle, not an APK. Web preview uses the local API URL; production builds still need a real backend URL and existing EAS guards remain active.
