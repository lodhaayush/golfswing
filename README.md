# Golf Swing Coach

**AI-powered golf swing analysis made easy**

**Try it now at [lodhaayush.github.io/golfswing](https://lodhaayush.github.io/golfswing/)**

A free, privacy-focused web application that analyzes your golf swing using AI pose detection. Upload a video of your swing and get instant feedback on your technique. All processing happens in your browser - your video never leaves your device.

## Features

- ✅ AI-powered pose detection using Google MediaPipe (33 body landmarks)
- ✅ Automatic camera angle detection (face-on and down-the-line)
- ✅ Club type detection (driver vs iron)
- ✅ Swing phase classification (address, backswing, top, downswing, impact, follow-through)
- ✅ 10+ mistake detectors covering setup, backswing, downswing, and tempo
- ✅ Detailed swing metrics (rotation, spine angle, arm extension, knee flex, tempo ratio)
- ✅ Side-by-side comparison with professional golfer swings
- ✅ Learning resources with explanations and drills for each mistake
- ✅ Privacy-first: all data processed locally in your browser
- ✅ Dark/light theme support

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173/golfswing/ in your browser.

### Build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## How It Works

Golf Swing Coach analyzes your swing by:

1. **Extracting frames** from your uploaded video
2. **Detecting pose** using MediaPipe to track 33 body landmarks per frame
3. **Classifying phases** - address, backswing, top, downswing, impact, follow-through
4. **Calculating metrics** - rotation angles, spine position, arm extension, tempo
5. **Running detectors** - specialized algorithms identify common swing flaws
6. **Generating results** - overall score with actionable feedback

All processing happens in your browser using IndexedDB for video storage. No data is sent to any server.

### Mistake Detection

The app detects common swing issues including:

- **Setup**: Poor posture, improper stance width
- **Backswing**: Insufficient shoulder turn, bent lead arm, lifting head, reverse pivot, over-rotation
- **Downswing**: Early extension, hanging back, loss of spine angle, sliding hips
- **Tempo**: Poor tempo ratio (ideal is 3:1 backswing to downswing)

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **MediaPipe Pose** - AI pose detection
- **idb-keyval** - IndexedDB wrapper

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## License

MIT
