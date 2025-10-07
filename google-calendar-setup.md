# Google Calendar Integration Setup Guide

## CRITICAL FIX NEEDED: Google Cloud Console Configuration

### Problem Diagnosis
✅ **App Configuration:** All correct (Client ID, Secret, Redirect URI)
❌ **Google Cloud Console:** Configuration mismatch causing "invalid_client"

### EXACT Steps to Fix in Google Cloud Console:

### 1. Fix OAuth 2.0 Client Configuration

**Step 1:** Go to [Google Cloud Console](https://console.cloud.google.com/)

**Step 2:** Navigate to "APIs & Services" > "Credentials"

**Step 3:** Find your OAuth 2.0 Client ID: `917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com`

**Step 4:** Click on it to edit

**Step 5:** **MOST IMPORTANT** - Add EXACT Redirect URI:
- In "Authorized redirect URIs" section
- Click "Add URI"
- Add **EXACTLY**: `https://decisionmaker.shrawantravels.com/api/auth/google/callback`
- **Note:** Must be HTTPS, must match exactly including the domain

### 2. Add Authorized Domains

**In the same OAuth client configuration:**
- Find "Authorized domains" section  
- **SKIP adding domains** - Google rejects `replit.dev` subdomains as "not top private domains"
- **Alternative:** Leave authorized domains empty (this is allowed for development)
- Or add only your custom domain if you have one

### 3. Set Up Test Users

**Step 1:** Go to "APIs & Services" > "OAuth consent screen"

**Step 2:** Scroll down to "Test users" section

**Step 3:** Click "Add users" and add:
- `salesrep@techize.com` (current logged-in user)
- `mlp.yashvantgupta@gmail.com` (your other test account)

### 4. Enable Required APIs

**Step 1:** Go to "APIs & Services" > "Library"

**Step 2:** Search for and enable:
- "Google Calendar API"
- "Google+ API" (if required)

### 5. Save All Changes

**Important:** Click "Save" button at the bottom of each configuration page

## Your Current Configuration
- **Client ID:** 917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com
- **Redirect URI:** https://decisionmaker.shrawantravels.com/api/auth/google/callback
- **Current Domain:** decisionmaker.shrawantravels.com

## What Each Domain Does:
- `replit.dev` - Main Replit domain
- `janeway.replit.dev` - Replit's infrastructure domain
- `decisionmaker.shrawantravels.com` - Your specific app domain

## After Configuration:
Once you've added these domains and the redirect URI, the "Reauth" button in your dashboard will work properly and you'll be able to authenticate with Google Calendar successfully.