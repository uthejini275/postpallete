# Pallete Smart Cards: launch guide

A free public website where anyone can upload a study PDF and get key-point cards, flip cards, a quiz and a summary. Visitors don't need a Claude account: the website uses **your** Claude API key on its server, and you pay a small amount per deck.

---

## What's in this folder

| File | What it does |
|---|---|
| `public/index.html`, `public/styles.css`, `public/app.js` | The website students see. It reads the PDF in their browser and shows the cards. |
| `api/cards.js` | The server part that sends the PDF text to Claude and returns the cards. |
| `api/explain.js` | The server part behind the "Explain it more simply" button. |
| `lib/core.js` | Shared settings: the AI prompt, the free daily limits and the model choice. |
| `public/birthday/` | The **Birthday Surprise Maker** (at `/birthday`) and the surprise page people receive (at `/b/…`). |
| `public/admin.html` | Your owner page for marking birthday orders as paid (at `/admin.html`). |
| `api/wish.js`, `api/admin.js`, `api/config.js`, `lib/store.js` | The server parts that save surprise pages and orders. |
| `vercel.json` | Settings for Vercel, the free hosting service. |
| `dev-server.js` | Only for testing on your own computer. |
| `.env.example` | A list of the settings you can change. |

---

## What it costs you

You pay for every deck students make. These are rough estimates for a normal 20-page chapter:

| Model (setting `CLAUDE_MODEL`) | Per deck | 100 decks |
|---|---|---|
| `claude-sonnet-5-5` (**the default**, good quality) | about ₹5–7 | about ₹500–700 |
| `claude-opus-5-5` (best quality, costs more) | about ₹11–17 | about ₹1,100–1,700 |
| `claude-haiku-5-5` (basic quality, cheapest) | about ₹0.30–0.50 | about ₹30–50 |

Each "Explain it more simply" tap costs well under ₹1 on the default model. With the default limit of 50 decks a day, the most the site can spend is about ₹250–350 a day. Hosting on Vercel and the Upstash limit store are free at this size.

**Built-in protection for your bill:**
- Each visitor gets **3 free decks a day** (`FREE_DECKS_PER_DAY`) and **30 explanations a day** (`FREE_EXPLAINS_PER_DAY`).
- The whole site stops at **50 decks a day** (`SITE_DECKS_PER_DAY`). Students then see "we've reached today's limit, try again tomorrow". Raise it as your budget allows.
- Decks that fail don't count against anyone's limit.
- If a student closes the page mid-way, the request stops so you don't pay for the rest.
- **Also set a monthly spend limit in the Claude Console** (step 1). That's the strongest safety net.

> Tip: to change the quality later, add a `CLAUDE_MODEL` setting in Vercel. It's one setting, with no code change.

---

## Step 1: Get your Claude API key

1. Go to **platform.claude.com** and sign up.
2. Open **Billing** and add credits. $10 (about ₹850) is plenty for testing.
3. In **Limits**, set a **monthly spend limit** you're comfortable with, like $20.
4. Open **API Keys** → **Create Key**, name it `smart-cards`, and copy it.
   - Treat it like a password. Never post it, share it in a DM or put it inside a file you upload.

## Step 2: Put the code on GitHub

1. Make a free account at **github.com**.
2. Click **+** → **New repository**, name it `smart-cards`, choose **Private**, then **Create repository**.
3. Click **uploading an existing file**, and drag in everything from this folder **except** `node_modules` and `.env`.
   (Keep the folder structure: `api`, `lib` and `public` must stay as folders.)
4. Click **Commit changes**.

## Step 3: Put the website online with Vercel

1. Go to **vercel.com** and **sign up with GitHub**. The free Hobby plan is enough.
2. Click **Add New → Project** and **Import** your `smart-cards` repository.
3. **Framework Preset:** choose **Other**. Leave the build settings empty.
4. Open **Environment Variables** and add:
   - Name `ANTHROPIC_API_KEY`, Value: your key from step 1.
   - Nothing else is needed. The site already uses the good-quality model.
5. Click **Deploy**. After about a minute you get a link like `smart-cards-xyz.vercel.app`. That's your website.

## Step 4: Make the free limits reliable (free, 2 minutes)

Without this, the daily limits reset whenever Vercel restarts its server, so a student could get more free decks than you intended.

1. In your Vercel project, open the **Storage** tab → **Upstash** (Redis) → **Create**, then pick the free plan.
2. Connect it to the `smart-cards` project. Vercel adds the settings automatically.
3. Open **Deployments** → **⋯** on the latest one → **Redeploy**.

## Step 5: Test before you share

1. Open your link on your phone and laptop.
2. Upload one BTech chapter and one school chapter, and check the cards are correct.
3. Try "Explain it more simply", the flip cards and the quiz.
4. In the Claude Console, open **Usage** to see what those decks actually cost.

## Step 6 (optional): Your own web address

Buy a name like `postpallete.in` from GoDaddy, Hostinger or Namecheap (about ₹500–800 a year). Then in Vercel go to **Settings → Domains**, add it, and follow the instructions Vercel shows.

---

## All settings (Vercel → Settings → Environment Variables)

After changing any setting, redeploy (Deployments → ⋯ → Redeploy).

| Setting | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | Your Claude API key. |
| `CLAUDE_MODEL` | `claude-sonnet-5-5` | Which Claude model makes the cards: `claude-haiku-5-5` (basic), `claude-sonnet-5-5` (good) or `claude-opus-5-5` (best). |
| `CLAUDE_EFFORT` | `low` | How hard the model thinks: `low`, `medium` or `high`. Higher is slower and costs more. |
| `FREE_DECKS_PER_DAY` | `3` | Free decks per visitor per day. |
| `FREE_EXPLAINS_PER_DAY` | `30` | Free "Explain it more simply" taps per visitor per day. |
| `SITE_DECKS_PER_DAY` | `50` | Total decks the whole site makes per day. Protects your bill. |
| `CLAUDE_FALLBACKS` | on | A safety net: if Claude declines a request, a backup model tries automatically. Set to `off` to disable. |

---

## Testing on your own computer (optional)

You need Node.js 20 or newer from nodejs.org.

```bash
npm install
```

To test without any cost, create a file called `.env` containing `MOCK_AI=1`. The site then shows a fake test deck:

```bash
npm run dev
```

Then open http://localhost:3000. To test with real AI, put `ANTHROPIC_API_KEY=your-key` in `.env` instead of `MOCK_AI=1`.

---

## Good to know

- **Privacy:** PDFs are read in the student's browser. Only the extracted text (or page pictures, for scanned PDFs) is sent to the server and on to Claude to make the cards. Nothing is saved on your server. Decks are saved only in the student's own browser.
- **Limits per deck:** up to 60 pages, or about 90,000 characters of text. Scanned PDFs: up to 8 pages.
- **Logs:** in Vercel → your project → **Logs**, each deck shows a line like `deck ok` with token counts, and failures show `deck failed` with a reason.
- **Paid plans later:** when you're ready to charge (for example ₹49 for 30 decks), the next step is adding Razorpay payments and student logins.

---

# 🎁 Birthday Surprise Maker

Lives on the same website at **`/birthday`** (for example `smart-cards-xyz.vercel.app/birthday`). It doesn't use AI, so it costs you nothing to run.

## What the birthday person experiences
It plays like an Instagram story (tap right for next, left for back, with progress bars at the top):
1. 🔒 **Midnight lock** (optional): a live countdown until 12:00 AM on their birthday.
2. 🤨 **Secret question** (optional): "Prove you're really Sneha 😏", with funny replies to wrong answers and a hint after 3 tries. Only a fingerprint of the answer is saved, never the answer itself.
3. 👀 "Psst… Sneha", then **Happy Birthday** with letters dropping in, their name and an age sticker.
4. 📊 **Your life in numbers** (if a date of birth is given): days, hours, heartbeats, full moons and the weekday they were born.
5. 📸 **Photo stories** with captions.
6. 🤫 **Scratch-to-reveal** secret last photo (optional).
7. 💌 **The letter**, typing itself out.
8. 🎂 **The cake**: they blow on their phone (using the mic) or tap the candles, then fireworks and a **"Say thank you on WhatsApp"** button.

## How it works for the customer (pay before create)
1. They open `/birthday`, fill in the details and watch the **free live preview**.
2. They tap **"Pay ₹29 & create my link"**.
3. **If Razorpay is set up:** a payment window opens (UPI, GPay, PhonePe, cards). After paying, **their link is ready instantly**, with nothing for you to do.
   **If not:** they scan your UPI QR, pay, and paste the **UPI transaction ID**. Their link works once you approve it.
4. **Nobody can see a surprise before it's paid.** An unpaid link only shows "This surprise is still being wrapped… 🎁".

## How you handle a manual UPI order
1. Open **`/admin.html`** on your website and type your owner password (`ADMIN_KEY`).
2. Orders marked **"⏳ Check payment"** show the customer's **UPI transaction ID**.
3. Find that ID in your UPI app's payment history and check that ₹29 actually arrived. Don't trust screenshots.
4. Tap **Approve**. Their link starts working straight away.

## Setting up automatic payments with Razorpay (recommended)
1. Sign up at **razorpay.com** with your PAN and bank account, and finish the KYC. It usually takes 1–3 days to activate.
2. In the Razorpay Dashboard, go to **Account & Settings → API Keys → Generate Key**. You get a **Key ID** and a **Key Secret**.
3. In Vercel → Settings → Environment Variables, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then redeploy.
4. Razorpay takes about 2% of each payment (about ₹0.60 on ₹29). The money reaches your bank account automatically.
   To try it without real money first, use the **Test Mode** keys from Razorpay.
   If a customer paid but closed the page too early, their order shows "Not paid yet". Find the payment in the Razorpay Dashboard (its receipt is the order code) and tap **Approve**.

## Setup (in Vercel → Settings → Environment Variables)
| Setting | Example | What it does |
|---|---|---|
| `ADMIN_KEY` | a long password only you know | Lets you open `/admin.html`. **Required.** |
| `UPI_ID` | `yourname@okhdfcbank` | For manual UPI payments, shown with a QR code. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | from the Razorpay Dashboard | Turns on automatic payments. Keep the secret private. |
| `UPI_NAME` | `Post Pallete Studio` | Name shown in the customer's UPI app. |
| `BIRTHDAY_PRICE` | `29` | Price in rupees. |
| `RECHARGE_PRICE` | `50` | Price in rupees for a Recharge Him gift (default 50). |
| `INSTAGRAM_HANDLE` | `postpallete_.stdio` | Where customers DM you for help. |
| `FREE_SURPRISES_PER_DAY` | `10` | Surprises one person can start per day (stops spam). |

**Upstash (step 4 above) is required** for the birthday maker, because it's where the surprise pages are saved. Without it, saving shows "The site isn't set up correctly yet".

Pages stay online for about 13 months, and then are deleted automatically.

## Recharge Him (Men's Day gift) at `/recharge`
- Customers write his name, 3–5 reasons and a note, see a live preview, then pay (₹50 by default).
- The gift link looks like `/r/AbC123xYz9`. It stays locked until the payment is confirmed.
- It uses the same payments, Upstash storage and owner page as the birthday maker. On `/admin.html`, Recharge orders show a 🔋 and birthday orders a 🎂.
- Files: `public/recharge/` (pages), `api/wish.js` and `api/pay.js` (saving and payments), and the `/r/:id` rewrite in `vercel.json`.
