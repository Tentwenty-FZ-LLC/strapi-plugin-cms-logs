# @npm_tentwenty/strapi-plugin-cms-logs

A Strapi v5 admin plugin for browsing, searching, and downloading daily log files — directly from the Strapi admin panel without needing server access or SSH.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Plugin Configuration](#plugin-configuration)
- [Setting Up File Logging in Strapi](#setting-up-file-logging-in-strapi)
  - [Option A — simple-node-logger (recommended)](#option-a--simple-node-logger-recommended)
  - [Option B — Pino (Strapi's built-in logger)](#option-b--pino-strapirsquos-built-in-logger)
  - [Option C — Winston](#option-c--winston)
- [Log File Naming Convention](#log-file-naming-convention)
- [What Is Visible in the Log Viewer](#what-is-visible-in-the-log-viewer)
  - [Log Levels](#log-levels)
  - [Supported Log Formats](#supported-log-formats)
- [Permissions Setup](#permissions-setup)
- [Plugin Settings](#plugin-settings)
- [Using the Log Viewer](#using-the-log-viewer)
- [Troubleshooting](#troubleshooting)

---

## Overview

`@npm_tentwenty/strapi-plugin-cms-logs` adds a **Log Viewer** page to the Strapi admin panel. It reads daily log files from a configurable directory on the server and renders them with structured formatting — timestamp, log level badge, and message — all colour-coded by severity.

The plugin does **not** produce logs itself. It reads files that your existing logger (Pino, Winston, simple-node-logger, or any compatible library) writes to disk. The only requirement is that log files follow the [naming convention](#log-file-naming-convention) described below.

---

## Features

| Feature | Description |
|---|---|
| **Structured log view** | Each line is parsed into timestamp · level badge · message |
| **6 severity levels** | `fatal` `error` `warn` `info` `debug` `trace` — colour-coded |
| **Real-time search** | Filter visible lines instantly as you type |
| **Date picker** | Browse any day within the last 3 months |
| **Download** | Download the raw `.log` file for any day |
| **RBAC** | Three separate permissions: Read, Download, Configure |
| **Configurable settings** | Log directory and max-lines limit stored in the Strapi DB |
| **Multi-format parsing** | Supports simple-node-logger, Pino (pretty + JSON), Winston, and generic formats |

---

## Requirements

| Dependency | Version |
|---|---|
| `@strapi/strapi` | `^5.0.0` |
| `react` | `^18.3.1` |
| `react-dom` | `^18.3.1` |

Node.js `>=18.0.0`

---

## Installation

```bash
npm install @npm_tentwenty/strapi-plugin-cms-logs
# or
yarn add @npm_tentwenty/strapi-plugin-cms-logs
```

---

## Plugin Configuration

Register the plugin in `config/plugins.js` (or `config/plugins.ts`):

```js
// config/plugins.js
module.exports = ({ env }) => ({
  'cms-logs': {    // ← the plugin ID derived from the package name, not the full npm name
    enabled: true,
    config: {
      // Optional: override the log directory here instead of via the Settings page.
      // Equivalent to setting LOG_DIR as an environment variable.
    },
  },
});
```

> **Note:** The key `'cms-logs'` is the **plugin ID** automatically derived from the package name  
> (`@npm_tentwenty/strapi-plugin-cms-logs` → strip scope + `strapi-plugin-` → `cms-logs`).  
> Use `'cms-logs'` as the key everywhere Strapi expects a plugin identifier (config, permissions, services).

Restart Strapi after adding this. The plugin menu entry (**CMS Logs**) and the Settings section (**Settings → CMS Logs → Configuration**) will appear after the next startup.

---

## Setting Up File Logging in Strapi

The plugin reads log files from disk. Out of the box, Strapi only writes logs to **stdout** — you need to configure a file transport so that log lines are persisted. Choose one of the options below.

> **Important:** Whatever logger you choose, the output files **must** follow the [naming convention](#log-file-naming-convention) described in the next section.

---

### Option A — simple-node-logger (recommended)

`simple-node-logger` produces the format this plugin parses most accurately (full date + time + level).

**1. Install the package**

```bash
npm install simple-node-logger
```

**2. Create `config/logger.js`**

```js
// config/logger.js
'use strict';

const path = require('path');
const fs   = require('fs');
const SimpleNodeLogger = require('simple-node-logger');

function createDailyLogger() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const day    = String(now.getDate()).padStart(2, '0');

  const logBase = process.env.LOG_DIR || 'public/logs';
  const yearDir = path.join(process.cwd(), logBase, `strapi_${year}`);

  // Ensure the directory exists before writing
  fs.mkdirSync(yearDir, { recursive: true });

  return SimpleNodeLogger.createSimpleLogger({
    logFilePath:     path.join(yearDir, `strapi_log_${year}.${month}.${day}.log`),
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    level:           process.env.LOG_LEVEL || 'info',
  });
}

module.exports = createDailyLogger();
```

**3. Wire the logger into Strapi**

In `config/server.js` (or `config/server.ts`), attach the logger instance:

```js
// config/server.js
const logger = require('./logger');

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  logger,
});
```

**4. Use it anywhere in your Strapi code**

```js
// Inside a service, controller, lifecycle hook, etc.
strapi.log.info('User signed in', { userId: user.id });
strapi.log.warn('Rate limit approaching for IP %s', ip);
strapi.log.error('Payment failed', err);
```

---

### Option B — Pino (Strapi's built-in logger)

Strapi v5 uses [Pino](https://getpino.io/) internally. You can add a file transport that writes JSON-formatted log lines alongside the default stdout stream.

**1. Install `pino-roll`** (provides automatic daily rotation)

```bash
npm install pino-roll
```

**2. Create `config/logger.js`**

```js
// config/logger.js
'use strict';

const path = require('path');
const fs   = require('fs');

const logBase = process.env.LOG_DIR || 'public/logs';
const year    = new Date().getFullYear();
const yearDir = path.join(process.cwd(), logBase, `strapi_${year}`);

fs.mkdirSync(yearDir, { recursive: true });

module.exports = {
  // Keep Strapi's default pretty-printed console output
  transports: [
    {
      target: 'pino-pretty',
      options: { colorize: true },
    },
    // Write JSON lines to a daily-rolled file
    {
      target: 'pino-roll',
      options: {
        file:      path.join(yearDir, 'strapi_log_.log'),
        frequency: 'daily',
        dateFormat: 'YYYY.MM.DD',
        // This produces: strapi_log_2026.05.25.log  ✔
        mkdir: true,
      },
    },
  ],
  level: process.env.LOG_LEVEL || 'info',
};
```

> **Note:** Pino JSON lines are fully supported by the viewer. Each line is parsed as `{"level":30,"time":1716624225000,"msg":"..."}` and rendered with the correct timestamp and level badge.

---

### Option C — Winston

**1. Install packages**

```bash
npm install winston winston-daily-rotate-file
```

**2. Create `config/logger.js`**

```js
// config/logger.js
'use strict';

const path    = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logBase = process.env.LOG_DIR || 'public/logs';

const transport = new winston.transports.DailyRotateFile({
  dirname:         path.join(process.cwd(), logBase, 'strapi_%Y'),
  filename:        'strapi_log_%DATE%.log',
  datePattern:     'YYYY.MM.DD',
  zippedArchive:   false,
  maxFiles:        '90d',
  createSymlink:   false,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
});

module.exports = winston.createLogger({
  level:       process.env.LOG_LEVEL || 'info',
  transports:  [
    new winston.transports.Console({ format: winston.format.simple() }),
    transport,
  ],
});
```

**3. Wire it into Strapi** (same as Option A, step 3)

```js
// config/server.js
const logger = require('./logger');
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  logger,
});
```

---

## Log File Naming Convention

The plugin resolves log files using this exact path pattern:

```
<LOG_DIR>/strapi_<YYYY>/strapi_log_<YYYY.MM.DD>.log
```

| Part | Example | Notes |
|---|---|---|
| `LOG_DIR` | `public/logs` | Configurable — see [Plugin Settings](#plugin-settings) |
| `strapi_<YYYY>` | `strapi_2026` | Year sub-folder, created automatically by your logger |
| `strapi_log_<YYYY.MM.DD>.log` | `strapi_log_2026.05.25.log` | One file per day |

**Full example path:**

```
<project-root>/
└── public/
    └── logs/
        └── strapi_2026/
            ├── strapi_log_2026.05.23.log
            ├── strapi_log_2026.05.24.log
            └── strapi_log_2026.05.25.log
```

> If the file for the selected day does not exist, the viewer shows "No log file found for YYYY.MM.DD".

---

## What Is Visible in the Log Viewer

### Log Levels

Every log line is classified into one of six severity levels. The viewer displays each level with a distinct colour badge:

| Level | Colour | When to use |
|---|---|---|
| `fatal` | 🔴 Red (bright) | Application is about to crash or is in an unrecoverable state |
| `error` | 🔴 Red | An operation failed — exception thrown, API call rejected, DB error |
| `warn` | 🟡 Amber | Something unexpected happened but the process continues |
| `info` | ⬜ Light grey | Normal operational messages — server started, user logged in |
| `debug` | ⬜ Medium grey | Developer-detail messages useful during development |
| `trace` | ⬜ Dark grey | Extremely verbose output — request/response bodies, SQL queries |

Error and Fatal lines are additionally highlighted with a **left border** and a subtle background tint so they stand out while scrolling.

### Supported Log Formats

The parser tries each format in priority order. The first match wins.

#### 1. simple-node-logger

```
[2026-05-25 10:23:45.123] INFO  User authenticated — userId=42
[2026-05-25 10:24:01.456] ERROR Database connection refused
```

Pattern: `[YYYY-MM-DD HH:mm:ss.SSS] LEVEL  message`

#### 2. Pino (pretty-printed)

```
[10:23:45.123] INFO (1234): Server started on port 1337
[10:24:01.456] ERROR (1234): Unhandled rejection
```

Pattern: `[HH:mm:ss.SSS] LEVEL (pid): message`

#### 3. Pino (JSON — raw file output)

```json
{"level":30,"time":1716624225123,"pid":1234,"msg":"Server started on port 1337"}
{"level":50,"time":1716624241456,"pid":1234,"msg":"Unhandled rejection","err":{"message":"ECONNREFUSED"}}
```

The viewer parses the `level` (numeric → string), converts `time` (Unix ms) to a readable timestamp, and appends `err.message` when present.

#### 4. Winston / generic timestamp

```
2026-05-25 10:23:45 [INFO]: Server started on port 1337
2026-05-25T10:24:01.456 ERROR Database connection refused
```

Pattern: `YYYY-MM-DD HH:mm:ss [LEVEL]: message` or `YYYY-MM-DDTHH:mm:ss LEVEL message`

#### 5. Fallback (stack traces & unstructured lines)

Any line that does not match the formats above is still displayed. The parser:

- Scans the line for an ISO datetime (`YYYY-MM-DD HH:mm:ss`) or a bracketed time (`[HH:mm:ss]`) and uses it as the timestamp
- Infers the level by keyword matching (`error`, `warn`, `debug`, `trace`, `fatal`) — defaults to `info`
- Displays the full raw line as the message

This means **stack trace lines** (which follow an error line) are rendered as `info`-level entries preserving every detail of the trace.

---

## Permissions Setup

After installing and enabling the plugin, you must grant permissions to the relevant roles.

1. Go to **Settings → Administration Panel → Roles**
2. Select the role to configure (e.g. *Editor*, *Developer*)
3. Scroll to the **Plugins** section
4. Expand **CMS Logs**
5. Tick the permissions needed:

| Permission | What it allows |
|---|---|
| **Read Logs** | Open the Log Viewer page and browse log files |
| **Download Logs** | Download the raw `.log` file for a selected day |
| **Configure Log Viewer** | Access *Settings → CMS Logs → Configuration* and change log directory / max lines |

> Super Admins have all permissions by default. All other roles start with no permissions.

---

## Plugin Settings

Navigate to **Settings → CMS Logs → Configuration** to adjust the following:

### Log Directory Path

The base folder where log files are stored, relative to the Strapi project root.

| Priority | Source | Example |
|---|---|---|
| 1 — highest | DB (this Settings page) | `storage/logs` |
| 2 | `LOG_DIR` environment variable | `LOG_DIR=storage/logs` in `.env` |
| 3 — lowest | Built-in default | `public/logs` |

Clear the field and save to remove the DB override and fall back to the env variable or default.

### Max Lines in Viewer

Maximum number of log lines displayed per day (range: 100–10 000, default: 1 000).

When a file exceeds this limit, the viewer shows the **most recent** N lines and displays a banner:

> ⚠ File too large — showing the last 1 000 of 24 312 lines. Use Download for the full file.

The **Download** button always fetches the complete untruncated file regardless of this setting.

---

## Using the Log Viewer

Navigate to **CMS Logs** in the left sidebar (requires *Read Logs* permission).

### Date picker

Click the date button at the top left. A compact calendar opens, allowing you to pick any day within the **last 3 months**. Future dates are disabled. The **Today** shortcut jumps back to the current day immediately.

### Search

Type in the search box to filter log lines in real time. The search is **case-insensitive** and matches anywhere in the raw log line (timestamp, level, and message). A counter shows `N of total lines` while a query is active. Click **×** or clear the field to reset.

### Refresh

Click **↻ Refresh** to re-fetch the log file from the server without navigating away. Useful when tailing today's log during an active session.

### Download

Click **↓ Download** to save the full raw log file for the selected day to your local machine (requires *Download Logs* permission). The download is not affected by the Max Lines setting.

---

## Troubleshooting

### "No log file found for YYYY.MM.DD"

The file `<LOG_DIR>/strapi_<YYYY>/strapi_log_<YYYY.MM.DD>.log` does not exist on the server.

- Check that your logger is actually writing to disk (verify the file exists via SSH or your hosting file manager).
- Confirm the **Log Directory** in Settings matches the path your logger writes to.
- Make sure the date format used by your logger matches `YYYY.MM.DD` (dots, not dashes).

### "Failed to load settings. Check that you have the Configure permission."

The currently logged-in user does not have the *Configure Log Viewer* permission. Go to **Settings → Roles** and grant it.

### Log lines appear with no timestamp

The line format was not recognised by any of the four structured parsers and fell through to the fallback. This is normal for continuation lines (stack traces). If all lines in a file show no timestamp, your logger format may not be supported — check the [Supported Log Formats](#supported-log-formats) section and compare against your actual file output.

### Build error: `styled-components` unresolved

When building a Strapi project that uses this plugin, ensure `styled-components` is in your project's dependencies (it is a peer dependency of `@strapi/icons`). Strapi's default scaffolded project includes it automatically.

---

## License

MIT
