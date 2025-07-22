# Deploying MLTrack Website to Vercel

## Quick Deploy (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: add mltrack.xyz marketing website"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select "Import Git Repository"
   - Choose the `mltrack` repository
   - **Important**: Set root directory to `website`
   - Click "Deploy"

3. **Configure Domain**
   - Go to Project Settings → Domains
   - Add `mltrack.xyz`
   - Add `www.mltrack.xyz`
   - Follow DNS instructions (add CNAME records)

## Manual Deploy via CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy from website directory**
   ```bash
   cd website
   vercel
   ```

3. **Production deployment**
   ```bash
   vercel --prod
   ```

## Environment Variables

No environment variables required for the marketing site.

## Custom Domain Setup

### For mltrack.xyz:

1. **Add to Vercel**
   - Project Settings → Domains
   - Add `mltrack.xyz` and `www.mltrack.xyz`

2. **Configure DNS** (choose one):

   **Option A - Nameservers (Recommended)**
   - Point domain nameservers to Vercel
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com

   **Option B - A/CNAME Records**
   - A record: `@` → `76.76.21.21`
   - CNAME: `www` → `cname.vercel-dns.com`

3. **Wait for propagation** (5-30 minutes)

## Automatic Deployments

Already configured! Every push to `main` will:
- Trigger a preview deployment for PRs
- Deploy to production for main branch
- Only rebuild if files in `website/` change

## Performance Optimizations

The site is already optimized with:
- Static generation for all pages
- Image optimization
- Font optimization
- Minimal JavaScript bundle

## Monitoring

After deployment:
1. Check [vercel.com/dashboard](https://vercel.com/dashboard)
2. View Analytics tab for performance metrics
3. Set up Plausible Analytics for visitor tracking

## Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Ensure Node.js version matches locally
- Clear cache: Project Settings → Functions → Clear Cache

### Domain not working
- Verify DNS propagation: `dig mltrack.xyz`
- Check SSL certificate status in Vercel
- Wait up to 24 hours for full propagation

### 404 errors
- Ensure root directory is set to `website`
- Check `next.config.js` for any path issues