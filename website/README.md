# MLTrack Marketing Website

The marketing website for MLTrack - a drop-in enhancement for MLflow that adds deployment capabilities and a modern UI.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🛠️ Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide Icons** - Icon library

## 📁 Project Structure

```
website/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with dark theme
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   └── components/
│       ├── navigation.tsx        # Top navigation bar
│       ├── hero-section.tsx      # Hero with animated terminal
│       ├── animated-terminal.tsx # Terminal animation component
│       ├── problem-section.tsx   # Problem statements
│       ├── solution-section.tsx  # Solution comparisons
│       ├── features-section.tsx  # Feature cards grid
│       ├── cta-section.tsx      # Call to action
│       └── footer.tsx           # Site footer
├── public/
│   └── grid.svg           # Background grid pattern
└── package.json
```

## 🎨 Design Principles

- **Dark by default** - Modern, professional look
- **Purple accent** (#7c3aed) - Consistent brand color
- **Smooth animations** - Framer Motion for delightful interactions
- **Mobile-first** - Fully responsive design
- **Performance** - Optimized for speed

## 🚢 Deployment

Ready for deployment on Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Deploy with zero configuration
4. Connect mltrack.xyz domain

## 📝 Content Updates

### To update the hero tagline:
Edit `src/components/hero-section.tsx`

### To add/modify features:
Edit the `features` array in `src/components/features-section.tsx`

### To update terminal animation:
Edit the `commands` array in `src/components/animated-terminal.tsx`

## 🔧 Environment Variables

No environment variables required for the marketing site.

## 📊 Analytics

Ready for Plausible Analytics integration:
- Add script tag to `layout.tsx`
- Configure domain in Plausible dashboard

## 🐛 Known Issues

- None currently

## 📄 License

MIT License - same as MLTrack core project.