# How to Deploy to GitHub Pages

## Prerequisites

- GitHub CLI (`gh`) authenticated as `islamux`
- `pnpm` installed

## Steps

```bash
# 1. Ensure you're on main with latest
git checkout main && git pull origin main

# 2. Build the web app
pnpm --dir web build

# 3. Copy built files to a temp location
rm -rf /tmp/gh-pages-deploy
cp -r web/dist /tmp/gh-pages-deploy

# 4. Delete old gh-pages branch (remote + local)
git push origin --delete gh-pages
git branch -D gh-pages 2>/dev/null

# 5. Create orphan branch with only dist files
git checkout --orphan gh-pages
rm -rf docs pipeline supabase web .gitignore
cp -r /tmp/gh-pages-deploy/* .

# 6. Commit and force push
git add -A
git commit -m "deploy: <describe what changed>"
git push origin gh-pages --force

# 7. Return to main
git checkout main
git branch -D gh-pages 2>/dev/null

# 8. Clean up temp
rm -rf /tmp/gh-pages-deploy assets data 404.html index.html
```

## Notes

- Uses orphan branch to keep `gh-pages` clean (only built files, no source or node_modules)
- GitHub Pages URL: https://islamux.github.io/tafseer-nabulsi/
- The `data/` directory contains 50+ MB of JSON — push may take a while
- If `git push` times out, retry: `git push origin gh-pages --force`
