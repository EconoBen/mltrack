# MLTrack Documentation Recording Guide

## Recording Tools Setup

### Terminal Recording: Asciinema

**Installation:**
```bash
# macOS
brew install asciinema

# Linux
sudo apt-get install asciinema
```

**Basic Usage:**
```bash
# Start recording
asciinema rec demo.cast

# Stop recording
# Press Ctrl+D or type 'exit'

# Upload and share
asciinema upload demo.cast
```

**Best Practices:**
- Keep recordings under 2 minutes
- Use clear, deliberate typing
- Pause between commands for readability
- Hide sensitive information with environment variables

### Screen Recording: Kap (macOS)

**Installation:**
```bash
brew install --cask kap
```

**Configuration:**
- Export format: GIF for short demos, MP4 for longer content
- FPS: 15 for GIFs, 30 for videos
- Dimensions: 800x600 or 1280x720
- Show clicks: Enable for tutorials

### Professional Recording: ScreenFlow (macOS)

**Key Settings:**
- Resolution: 1920x1080 (scale down later)
- Frame rate: 30fps
- Audio: System audio + microphone (if narrating)
- Mouse: Show clicks and highlight cursor

## Video Compression Pipeline

### FFmpeg Installation
```bash
brew install ffmpeg gifsicle
```

### GIF Creation Pipeline

**1. High-Quality GIF (2-step process):**
```bash
# Generate optimized palette
ffmpeg -i input.mp4 -vf "fps=10,scale=600:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" palette.png

# Create GIF using palette
ffmpeg -i input.mp4 -i palette.png -filter_complex \
"fps=10,scale=600:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
output.gif

# Further optimize with gifsicle
gifsicle -O3 --lossy=20 -o final.gif output.gif
```

**2. Quick GIF for demos:**
```bash
# One-liner for quick conversion
ffmpeg -i input.mp4 -vf "fps=10,scale=480:-1" -pix_fmt rgb24 quick.gif
```

### MP4 Compression

**For web deployment:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k output.mp4
```

**For documentation embeds:**
```bash
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -preset medium -crf 28 -movflags +faststart output.mp4
```

## Recording Templates

### Terminal Demo Template
```bash
# Clear terminal for clean start
clear

# Show context
echo "MLTrack Demo: [Feature Name]"
echo "=========================="
echo ""

# Demonstrate feature
mltrack [command]

# Show results
ls -la
cat results.json
```

### Feature Showcase Template
1. **Opening** (2s): Show MLTrack logo/title
2. **Problem** (5s): Show the issue being solved
3. **Solution** (10-15s): Demonstrate MLTrack feature
4. **Result** (3s): Show the successful outcome

## Recording Checklist

### Pre-Recording
- [ ] Clean desktop/terminal
- [ ] Close unnecessary applications
- [ ] Set consistent terminal theme
- [ ] Prepare demo data
- [ ] Test commands first
- [ ] Set recording dimensions

### During Recording
- [ ] Speak clearly (if narrating)
- [ ] Move cursor deliberately
- [ ] Pause after each action
- [ ] Highlight important areas
- [ ] Keep it concise

### Post-Processing
- [ ] Trim dead space
- [ ] Add annotations if needed
- [ ] Compress appropriately
- [ ] Test playback
- [ ] Check file size (<5MB for GIFs)

## File Organization

```
website/
└── public/
    └── demos/
        ├── gifs/
        │   ├── quick-start.gif
        │   ├── deployment.gif
        │   └── cost-tracking.gif
        ├── videos/
        │   ├── full-tutorial.mp4
        │   └── feature-deep-dive.mp4
        └── terminal/
            ├── installation.cast
            └── first-experiment.cast
```

## Quality Standards

### GIFs
- Size: <5MB (ideally <2MB)
- Dimensions: 600-800px width
- FPS: 10-15
- Duration: 5-15 seconds

### Videos
- Resolution: 1280x720 minimum
- Bitrate: 2-4 Mbps
- Format: MP4 (H.264)
- Audio: Clear, normalized

### Terminal Recordings
- Font size: 14-16pt
- Theme: Consistent light/dark
- Speed: Natural typing pace
- Duration: <2 minutes

## Recommended Workflow

1. **Plan**: Script your demo
2. **Record**: Capture raw footage
3. **Edit**: Trim and enhance
4. **Compress**: Optimize file size
5. **Review**: Test on slow connections
6. **Deploy**: Add to documentation

## Tools Summary

| Tool | Best For | Platform | Cost |
|------|----------|----------|------|
| Asciinema | Terminal sessions | All | Free |
| Kap | Quick GIFs | macOS | Free |
| ScreenFlow | Pro videos | macOS | $149 |
| FFmpeg | Compression | All | Free |
| Gifsicle | GIF optimization | All | Free |