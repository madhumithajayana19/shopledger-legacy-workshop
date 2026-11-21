# Repository Guidelines

## Project Structure

- `server.js` starts the Express app, mounts the `routes/` modules under `/api`, and serves printable invoices at `/orders/:id/invoice`.
- `lib/` contains checkout pricing, GST and coupons, inventory, orders, the Khata credit ledger, invoices, reports, and JSON storage.
- `public/` contains the browser UI and its static HTML, CSS, and JavaScript. See [the architecture diagram](docs/architecture.svg) for the order flow.
- `config.js` holds shop settings, GST slabs, and coupon rules. `data/db.json` is both the tracked starting dataset and the runtime database.

## Local Development

- `npm install` installs the dependencies declared in `package.json`.
- `npm start` runs `node server.js`. Open `http://localhost:3000` or set the `PORT` environment variable before starting. There is no build step.
- `npm test` is a placeholder that exits with an error. The repository has no test suite, test naming convention, or coverage threshold.

## Coding Style

Use two-space indentation, single-quoted strings, semicolons, and camelCase identifiers in JavaScript. Match the surrounding CommonJS patterns (`require()`, `exports`, and `module.exports`) and use lowercase module filenames such as `pricing.js`. Keep HTTP handling in `routes/` and reusable business rules in `lib/`. No formatter or linter is configured.

## Verification and Data

Use a disposable checkout or back up `data/db.json` before manual tests that write orders or settlements. Review the JSON diff before committing and keep test transactions out of the tracked dataset. For checkout changes, verify stock deductions, coupon limits, and mixed GST slabs. For tax or invoice changes, compare the saved order with its printable invoice and the GST reconciliation report. For Khata changes, verify the customer balance after billing, settlement, and cancellation.

## Commits and Pull Requests

Follow the history’s short, lowercase, unprefixed subjects, such as `support hsn gst slabs and coupon maxDiscount caps`. In the PR, describe the behavior change, list the checks you ran, and link the relevant issue when available. Include screenshots for visible POS or invoice changes.
