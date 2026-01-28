# Golf Swing Coach - Claude Project Notes

## Debug Logs

Debug logs are written to `debug.log` in the project root directory. Check this file to debug analysis issues.

Key log entries to look for:
- `Camera Angle Detection` - detected camera angle and confidence
- `Club Type Detection` - detected club type and signals
- `Swing Metrics` - rotation metrics, spine angles
- `Face-on specific metrics` - hipSway, headStability, impactExtension (face-on only)
- `Detected Mistakes` - list of detected issues with severity
- `Score Calculation` - baseScore, mistakePenalty, overallScore breakdown
