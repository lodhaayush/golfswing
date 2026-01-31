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

Debug logs are written to `debug.log` in the project root directory. Check this file to debug analysis issues.

Key log entries to look for:
- `Camera Angle Detection` - detected camera angle and confidence
- `Club Type Detection` - detected club type and signals (stanceRatio, handDistance, spineAngle, armExtension, kneeFlexAngle)
- `Swing Metrics` - rotation metrics, spine angles
- `Face-on specific metrics` - hipSway, headStability, impactExtension (face-on only)
- `Detected Mistakes` - list of detected issues with severity
- `Score Calculation` - baseScore, mistakePenalty, overallScore breakdown
- `[DETECTOR_NAME] Debug:` - individual detector calculations and thresholds
