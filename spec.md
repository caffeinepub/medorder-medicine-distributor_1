# MedFlow

## Current State
PWA app with manifest.json, existing icons, and session persistence via localStorage. Office dashboard auth guard reads session on mount.

## Requested Changes (Diff)

### Add
- New maskable icon (already generated: medflow-maskable-icon.dim_512x512.png)
- Generate a 192x192 version of maskable icon

### Modify
- manifest.json: change background_color from #0f172a (very dark) to #ffffff (white), theme_color from #1e40af to #1e40af (keep), update icon entries to use new maskable icon for maskable purpose, keep existing icons for 'any' purpose
- OfficeAuthGuard: add useEffect that re-reads localStorage session on mount to ensure authed state is set correctly even after browser navigation/refresh

### Remove
- Nothing removed

## Implementation Plan
1. Generate 192x192 maskable icon version
2. Update manifest.json with white background_color and new maskable icons
3. Fix OfficeAuthGuard session persistence with useEffect re-check
