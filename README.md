# gassProductions Show Call

Branded, live-updating Run of Show pages for you and your crew. Each event gets **its own permanent URL** that never changes — when details change, you just edit one file and every crew member's open page updates automatically. No re-sending links.

---

## How it works (the important bit)

- The web page is **fixed** — you never touch it once it's live.
- All the event content lives in a plain text file called **`data.json`**.
- You edit `data.json`, save, and within ~1 minute the live page refreshes itself on everyone's phone. **The URL stays identical.**

So per job, you share one link, e.g.

```
https://YOUR-USERNAME.github.io/showcall/adobe-creative-summit/
```

…and that link is good for the life of the event, changes and all.

---

## One-time setup (about 5 minutes)

1. Go to **github.com** → sign in → click **New repository**.
2. Name it exactly **`showcall`**. Set it to **Public**. Click **Create repository**.
3. On the new repo page, click **Add file → Upload files**.
4. Drag in **everything inside this `showcall` folder** (the `index.html`, the `_TEMPLATE` folder, the `adobe-creative-summit` folder, and this README). Click **Commit changes**.
5. Go to the repo's **Settings → Pages**.
6. Under "Build and deployment", set **Source = Deploy from a branch**, **Branch = main**, folder **/(root)**. Click **Save**.
7. Wait ~1 minute. Your site is now live at:
   ```
   https://YOUR-USERNAME.github.io/showcall/
   ```

That root link shows a menu of all your events. Each event also has its own direct link (see below).

---

## Creating a new event

1. In the repo, open the **`_TEMPLATE`** folder and copy it (easiest way: on your computer, duplicate the `_TEMPLATE` folder, rename the copy to your event — use lowercase and hyphens, e.g. `sony-launch-may`).
2. Open that new folder's **`data.json`** and fill in your event (see the field guide below).
3. Drop speaker photos into the folder's **`photos`** subfolder.
4. Upload the new folder to the repo (**Add file → Upload files**).
5. Your new event is live at:
   ```
   https://YOUR-USERNAME.github.io/showcall/sony-launch-may/
   ```
6. (Optional) Add a line for it on the front menu by editing the root **`index.html`** — there's a clearly marked spot to copy a card.

**That direct event URL is the link you send your crew.**

---

## Updating a live event (the whole point)

1. In the repo, open your event folder → click **`data.json`** → click the **pencil ✏️** to edit.
2. Change whatever you need — a new set time, a swapped speaker, an extra slot.
3. Scroll down, click **Commit changes**.
4. Done. Every crew member with the page open sees the update within a minute. **You never resend the link.**

---

## The `data.json` field guide

```json
{
  "event":   "Event name (shown as the big title)",
  "date":    "2026-09-24",        // YYYY-MM-DD
  "venue":   "Venue, City",
  "client":  "Client name",        // optional
  "contact": "On-site contact",    // optional
  "schedule": [ ...segments... ]
}
```

Each item in `schedule` is one slot:

| Field      | Required | What it is |
|------------|----------|------------|
| `start`    | yes      | Start time, 24-hour `"HH:MM"` (e.g. `"09:30"`) |
| `duration` | yes      | Length in minutes (e.g. `20`). The end time is worked out for you. |
| `speaker`  | —        | Speaker's name |
| `role`     | —        | Job title |
| `org`      | —        | Company / organisation |
| `title`    | —        | Talk or segment title |
| `photo`    | —        | Path to their photo, e.g. `"photos/jane-doe.jpg"`. Leave out and it shows their initials. |
| `desc`     | —        | Optional one-line description |
| `note`     | —        | **Crew note** — highlighted in gold (mic channels, VT cues, lighting states…) |
| `type`     | —        | Set to `"break"` for non-speaker rows (registration, coffee, lunch). |

Slots are automatically sorted by start time, so you can add them in any order.

### Photos
- Put image files in the event's `photos` folder and reference them as `"photos/filename.jpg"`.
- Square-ish images look best; they're shown at ~64px.
- You can also paste a direct image URL instead of a local file. (Note: LinkedIn photo links often expire or block hot-linking — safest to download the image and upload it to the `photos` folder.)

---

## What the crew sees

- gassProductions-branded page (black / white / gold, Outfit typeface).
- A live clock and the full schedule as a timeline.
- The current slot is highlighted gold with a **● Live now** badge; the next slot is flagged **Up next**; finished slots dim to **Done** — all worked out automatically from the times.
- Each slot shows the speaker's photo, name, title, company, set time and duration, plus any crew note.
- The page quietly re-checks for changes every minute — no manual refresh needed.

> Times are read in the **viewer's local time**. For an on-site crew that's exactly right. If someone checks from another timezone, the live highlight reflects their local clock.

---

## Tips

- Keep folder names lowercase with hyphens, no spaces (`bmw-roadshow-q3`, not `BMW Roadshow Q3`).
- Don't rename a folder once you've shared its link — that's what changes the URL.
- The `_TEMPLATE` folder is just a starting point; leave it in the repo to copy from each time.
