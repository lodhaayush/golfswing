# Golf Swing Coach - Claude Project Notes

## Development Guidelines

### Code Change Approval

**IMPORTANT: Always ask for approval before making code changes.**

- Explain the proposed changes and reasoning before editing any files
- Wait for explicit user approval before implementing changes
- Do not assume the user wants changes made automatically

### Compilation Checks

**IMPORTANT: Always run compilation checks after making code changes.**

- Run `npx tsc --noEmit` after any code modification to verify the code compiles
- Fix any TypeScript errors before proceeding with further changes
- Do not assume code changes are correct without verification

### Debug Logging Policy

**IMPORTANT: Always add and leave debug logs in code for analysis.**

- Add `logger.info()` calls at key decision points in detectors and analysis code
- Include relevant metrics, thresholds, and intermediate calculations
- Never remove debug logs - they are essential for diagnosing analysis issues
- Use descriptive prefixes like `DETECTOR_NAME Debug:` for easy filtering

## Debug Logs

### Web App (React/TypeScript)

Debug logs are written to `debug.log` in the project root directory. Check this file to debug analysis issues.

Key log entries to look for:
- `Camera Angle Detection` - detected camera angle and confidence
- `Club Type Detection` - detected club type and signals (stanceRatio, handDistance, spineAngle, armExtension, kneeFlexAngle)
- `Swing Metrics` - rotation metrics, spine angles
- `Face-on specific metrics` - hipSway, headStability, impactExtension (face-on only)
- `Detected Mistakes` - list of detected issues with severity
- `Score Calculation` - baseScore, mistakePenalty, overallScore breakdown
- `[DETECTOR_NAME] Debug:` - individual detector calculations and thresholds

### iOS App (Native Swift)

The iOS app writes logs to the simulator's Documents directory using `DebugLogger`.

#### Accessing iOS Simulator Logs

1. **App debug.log file** (custom app logs):
   ```bash
   # Get the app container path (simulator must be running)
   CONTAINER=$(xcrun simctl get_app_container booted com.golfswing.GolfSwingCoach data)
   cat "$CONTAINER/Documents/debug.log"
   ```

2. **Unified system logs** (includes crashes, Vision framework errors):
   ```bash
   # View app logs from last 4 hours
   xcrun simctl spawn <SIMULATOR_UDID> log show --predicate 'process == "GolfSwingCoach"' --last 4h

   # Search for errors/crashes
   xcrun simctl spawn <SIMULATOR_UDID> log show --predicate 'process == "GolfSwingCoach"' --last 4h | grep -iE "error|crash|fatal|exception"
   ```

3. **Find simulator UDID**:
   ```bash
   xcrun simctl list devices booted
   ```

4. **CoreSimulator logs** (low-level simulator logs):
   ```bash
   # Main simulator log
   cat ~/Library/Logs/CoreSimulator/CoreSimulator.log | grep -i golf

   # Per-simulator logs
   ls ~/Library/Logs/CoreSimulator/<SIMULATOR_UDID>/
   ```

#### Common iOS Crash Patterns

- **Vision framework errors**: Look for `VNDetectHumanBodyPoseRequest` or `Espresso` errors - may indicate missing model weights on simulator
- **Continuation misuse**: `SWIFT TASK CONTINUATION MISUSE` - async/await continuation resumed multiple times
- **Memory issues**: Check for `EXC_RESOURCE` or memory warnings
