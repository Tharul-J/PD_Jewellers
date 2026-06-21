# How to work with Claude in VS Code — PD Jewellers project

## 1. Setup (one-time)
- Put this file at the root of your repo as `CLAUDE.md` or `.github/copilot-instructions.md`.
- This means you DON'T retype context every chat — Claude reads project files directly when you point to them.

## 2. The core rule: point, don't paste
Never paste full files into chat. Instead say:
> "Look at `src/controllers/productController.js` and fix X"

Claude (with file access) reads only what's needed. Pasting a 300-line file into chat burns tokens for no reason.

## 3. One task per message
Bad: "Fix the DB connection, also redo the admin dashboard, and check wishlist"
Good: One message = one task. Finish it, test it, then move to next.

Why: when a task fails mid-way, you only re-explain ONE thing, not three.

## 4. Always give Claude this shape of request:
1. **Goal** (1 line) — what should work after this
2. **File(s)** — exact path, don't make Claude search
3. **Current behavior** — what happens now (paste only the ERROR, not the whole file)
4. **Constraint** — e.g. "don't touch the 3D customizer code"

Example:
> Goal: connect MongoDB instead of CSV mock data.
> File: server/config/db.js, server/models/Product.js
> Current: products load from /data/products.csv
> Constraint: keep the same Product shape/fields, don't change frontend.

## 5. Let Claude write the plan, YOU execute the boring parts
For setup-type tasks (npm installs, env vars, MongoDB Atlas signup, GitHub steps), ask:
> "Give me the exact terminal commands / steps, I'll run them myself."

Don't ask Claude to "do" things that are just you clicking buttons in a browser or running `npm install`. That's pure token waste — you execute, Claude only writes code/logic.

## 6. Use Claude for: logic, debugging, architecture decisions, code review
Use yourself for: running commands, clicking through MongoDB Atlas / Render / Vercel dashboards, copy-pasting env vars, git commit/push.

## 7. Keep sessions scoped
Start a NEW chat per feature/module (e.g. one chat for "DB migration", a separate one for "admin dashboard orders"). Don't let one chat run 100+ messages across unrelated features — old irrelevant context still gets resent every turn and costs tokens.

## 8. When debugging an error
Paste ONLY:
- The exact error message/stack trace
- The file:line it points to
Not the whole console output, not the whole file.

## 9. Quick checklist before sending any message
- [ ] Did I name the exact file(s)?
- [ ] Is this ONE task?
- [ ] Did I paste only the relevant snippet/error, not a whole file?
- [ ] Could I just do this step myself (terminal/dashboard) instead of asking?
