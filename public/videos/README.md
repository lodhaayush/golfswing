# Pro Swing Videos

This directory contains pro swing reference videos for the comparison feature.

## Required Videos

| File | Camera Angle | Club Type |
|------|-------------|-----------|
| `pro-faceon-driver.mp4` | Face-On | Driver |
| `pro-faceon-iron.mp4` | Face-On | Iron |
| `pro-dtl-driver.mp4` | Down the Line | Driver |
| `pro-dtl-iron.mp4` | Down the Line | Iron |

## Adding Pro Videos

1. Source or record pro swing videos for each camera angle and club type
2. Add the MP4 files to this directory with the exact filenames listed above
3. Run the swing analysis on each video to extract pose frames and phase segments
4. Update `src/data/proVideos.ts` with the extracted analysis data

## Video Requirements

- Format: MP4 (H.264 recommended)
- Resolution: 720p or higher
- Frame rate: 30fps or higher (60fps preferred for slow-motion analysis)
- Duration: Full swing from address to finish (typically 2-5 seconds)
- Right-handed golfer (matching the current default)

## Placeholder Behavior

Until actual pro videos are added, the comparison feature will show a "video not found"
state but the UI will remain functional.
