# Pramaan Deployment Guide

This guide describes how to deploy Pramaan across **Vercel** (frontend), **Render** (FastAPI backend), and **Supabase** (PostgreSQL database).

---

## 1. Supabase (Database Setup)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Run the schema migration file:
   - File: `supabase/migrations/20261114000000_law_firm_schema.sql`
4. Copy your project credentials from **Project Settings > API**:
   - Project URL
   - Anonymous Key (`anon` / public)

---

## 2. Render (Backend Deployment)

The backend is configured via `render.yaml` (Blueprint).

1. In the [Render Dashboard](https://dashboard.render.com), click **New > Blueprint**.
2. Connect your GitHub repository. Render will automatically detect `render.yaml` and configure the `pramaan-api` web service.
3. Configure the following environment variables on Render:
   - `LLM_PROVIDER`: `groq` *(preconfigured in blueprint)*
   - `STAMP_DEMO_SAMPLE`: `1` *(preconfigured in blueprint)*
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`)
   - `APP_ORIGIN`: Your deployed Vercel frontend URL (e.g., `https://your-pramaan-app.vercel.app` or `http://localhost:5173` for testing)
4. Deploy the service. Note the deployed URL (e.g., `https://pramaan-api.onrender.com`).
5. Confirm health check: `GET https://pramaan-api.onrender.com/api/health` returns `{"status":"ok"}`.

---

## 3. Vercel (Frontend Deployment)

The frontend is configured via `vercel.json` with the Vite framework preset.

1. In the [Vercel Dashboard](https://vercel.com), click **Add New > Project** and import your repository.
2. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key
   - `VITE_HELPER_URL`: Your deployed Render backend URL (e.g., `https://pramaan-api.onrender.com`)
3. Click **Deploy**.
4. Both `/` (Main Workspace) and `/verify.html` (Standalone Verification Portal) will be served statically.
