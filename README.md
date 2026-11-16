# Daily Log

Two people, four daily habits, a Pomodoro timer. Static page plus one serverless function that stores data in Redis, so both of you see the same numbers on any device.

```
index.html     the whole app
api/data.js    reads and writes the log (Vercel serverless function)
README.md      this guide
```

## 1. Put it on GitHub

1. Create a new empty repository on github.com (private is fine).
2. In a terminal, from the folder holding these files:

```
git init
git add .
git commit -m "Daily Log"
git branch -M main
git remote add origin https://github.com/YOUR-USER/daily-log.git
git push -u origin main
```

## 2. Deploy on Vercel

1. Go to vercel.com, choose **Add New → Project**, and import the GitHub repo.
2. Leave every setting at its default (no framework, no build command) and click **Deploy**.

Every later `git push` redeploys automatically.

## 3. Connect the database (this makes it shared)

1. In your Vercel project, open the **Storage** tab.
2. Choose **Upstash Redis** (from the Marketplace), create a free database, and connect it to the project. Vercel adds the connection variables for you.
3. Open **Settings → Environment Variables** and check that you see either `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The function accepts both pairs.
4. **Redeploy** (Deployments tab → latest deployment → Redeploy) so the function picks them up.

Open your site. The top right should say `synced`. If you already logged minutes in a browser before this, they upload to the server the first time it connects.

## 4. Optional: lock it with a passcode

Anyone with the link can read and write the log. To require a passcode, add an environment variable `APP_PASSCODE` with any value, then redeploy. Each device is asked for it once and remembers it.

## Test locally

```
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

## Notes

- Names, minutes and targets-met history live in Redis. The Pomodoro settings (focus and break length, who it logs to) stay on each device.
- If the server can't be reached, the page keeps working from the browser's own storage and shows `offline`. It syncs again when the connection returns.
- Targets (60 / 300 / 30 / 30) are in the `ACTIVITIES` list at the top of the script in `index.html`.
