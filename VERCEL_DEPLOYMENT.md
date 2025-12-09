# Vercel Deployment Guide

This guide will help you deploy the Chessnoth Next.js application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you don't have one
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **Environment Variables**: You'll need:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Get from [WalletConnect Cloud](https://cloud.walletconnect.com)
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` - Your deployed CharacterNFT contract address

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project in Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your repository (GitHub/GitLab/Bitbucket)
   - Click "Import"

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**
   - In the "Environment Variables" section, add:
     ```
     NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
     NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress
     ```
   - Make sure to add them for all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts to link your project
   - When asked about environment variables, you can add them via CLI or dashboard

4. **Set Environment Variables (if not set during deployment)**
   ```bash
   vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   vercel env add NEXT_PUBLIC_CONTRACT_ADDRESS
   ```
   - Follow prompts to enter values for each environment

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Environment Variables Setup

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for wallet connections | [WalletConnect Cloud](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed CharacterNFT contract address | Your deployed contract on Conflux eSpace Testnet |

### Setting Environment Variables in Vercel Dashboard

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - **Key**: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - **Value**: Your WalletConnect project ID
   - **Environment**: Select all (Production, Preview, Development)
4. Repeat for `NEXT_PUBLIC_CONTRACT_ADDRESS`
5. Redeploy your application for changes to take effect

## Build Configuration

The project includes a `vercel.json` file that:
- Excludes Hardhat artifacts from the build (they're not needed for the Next.js app)
- Optimizes the build process
- Configures proper Next.js settings

## Post-Deployment Checklist

- [ ] Verify the app loads at your Vercel URL
- [ ] Test wallet connection (RainbowKit)
- [ ] Verify contract interactions work
- [ ] Check that all pages load correctly
- [ ] Test on mobile devices
- [ ] Verify environment variables are set correctly

## Troubleshooting

### Build Fails

1. **Check Build Logs**: Go to your project → Deployments → Click on failed deployment → View logs
2. **Common Issues**:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies

### Environment Variables Not Working

1. **Redeploy**: Environment variables require a redeploy to take effect
2. **Check Prefix**: Make sure `NEXT_PUBLIC_` prefix is used for client-side variables
3. **Verify Values**: Double-check values in Vercel dashboard

### Wallet Connection Issues

1. **Check WalletConnect Project ID**: Verify it's set correctly
2. **Check Network**: Ensure users can connect to Conflux eSpace Testnet
3. **Check Contract Address**: Verify the contract address is correct

### Hardhat Build Errors

- Hardhat is only needed for local contract deployment
- The `vercel.json` excludes Hardhat artifacts from the build
- If you see Hardhat-related errors, they shouldn't affect the Next.js build

## Custom Domain Setup

1. Go to your project settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificates

## Continuous Deployment

Vercel automatically deploys:
- **Production**: On push to `main` branch (or your default branch)
- **Preview**: On push to other branches or pull requests

You can configure this in Project Settings → Git.

## Monitoring

- **Analytics**: Enable Vercel Analytics in project settings
- **Logs**: View real-time logs in the Vercel dashboard
- **Performance**: Check Web Vitals in the Analytics section

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/environment-variables)

