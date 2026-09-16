# Bookmark web app

This directory contains the React/Vite interface for the Bookmark cinema
pricing demo.

## Commands

```sh
npm install
npm run dev       # start the Vite development server
npm run build     # create a production build in dist/
npm run preview   # preview the production build
npm run lint      # run Oxlint
```

The app is a client-side demo. It does not persist inventory or send SMS
messages directly. The **Create bill** action validates the customer details,
builds a short ticket message, and opens the device SMS composer with an
`sms:` URL.

## Source map

- `src/App.jsx` — seat controls, offer controls, live receipt, customer form,
  and bill/SMS handoff.
- `src/priceEngine.js` — browser-compatible paisa calculations and receipt
  formatting.
- `src/App.css` — responsive dark cinema UI.
- `src/main.jsx` — React entry point.

See the repository [README](../README.md) for the complete project overview.
