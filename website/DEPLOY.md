# Deployment Guide for mltrack.xyz

## Quick Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add website/
   git commit -m "feat: add mltrack.xyz marketing website"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import the `mltrack` repository
   - Set root directory to `website`
   - Deploy!

3. **Configure Domain**
   - In Vercel project settings, go to "Domains"
   - Add `mltrack.xyz`
   - Follow DNS configuration instructions

## Manual Deployment

### Build locally:
```bash
cd website
npm run build
npm start
```

### Deploy to any static host:
The `out/` directory contains the static site after build.

## Environment Variables

None required for the marketing site.

## Post-Deployment Checklist

- [ ] Verify all animations work
- [ ] Test mobile responsiveness
- [ ] Check all links
- [ ] Add Plausible Analytics
- [ ] Submit to search engines
- [ ] Share on social media