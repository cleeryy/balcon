/**
 * UI copy — English, single source of truth.
 *
 * i18n prep: this file is the whole `en` locale. To ship another language,
 * add `lib/strings.fr.ts` with the same shape (typed by `Strings`) and swap
 * the export below — no i18n runtime needed yet.
 */

export const strings = {
  meta: {
    titleDefault: "balcon — web page monitoring",
    titleTemplate: "%s · balcon",
    description:
      "balcon watches your web pages, detects changes and notifies you by email or webhook.",
    footer: "balcon — self-hosted web page monitoring.",
  },

  header: {
    tagline: "web page monitoring",
    dashboard: "Dashboard",
    githubRepo: "GitHub repository",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    themeLight: "Light theme",
    themeDark: "Dark theme",
  },

  dashboard: {
    eyebrow: "Dashboard",
    heading: "Your watches",
    intro:
      "Every page is re-checked on a schedule. Any change, any outage — it all shows up here.",
    updated: "Updated",
    reload: "Reload",
    reloadLabel: "Reload the list",

    stats: {
      total: "Watches",
      totalHint: "pages tracked",
      changed: "Changes",
      changedHint: "last check",
      errors: "Errors",
      errorsHint: "failing",
    },

    form: {
      placeholder: "https://example.com/page-to-watch",
      inputLabel: "Address of the page to watch",
      submit: "Watch this page",
      hint: "The address is checked every 30 minutes by default — you can change that on the configuration page.",
    },

    empty: {
      title: "No watches yet",
      description:
        "Paste an address above: balcon keeps checking it and lets you know the moment the content changes — by email or webhook.",
      footnote: "Notifications start after the first check.",
    },

    loadError: "We could not load your watches",
    retry: "Try again",
  },

  card: {
    checked: "Checked",
    neverChecked: "Never checked",
    everyInterval: (min: number) => `every ${min} min`,
    next: "Next",
    checkNow: "Check now",
    checkNowTitle: "Run a check right away",
    pausedTitle: "This watch is paused",
    pause: "Pause",
    resume: "Resume",
    pauseTitle: "Pause this watch",
    resumeTitle: "Resume watching",
    openSettings: "Open configuration",
    delete: "Delete",
    deleteTitle: "Delete",
    deleteConfirmTitle: "Click again to delete",
    confirm: "Confirm",
    deleteLabel: "Delete this watch",
  },

  detail: {
    backToWatches: "All watches",
    watching: "Watching",
    paused: "Paused",
    manualResume: "resume manually",
    checkNow: "Check now",

    summary: {
      lastCheck: "Last check",
      nextCheck: "Next check",
      checks: "Checks",
      snapshots: "Snapshots",
      never: "never",
      noChecks: "no checks yet",
      everyInterval: (min: number) => `every ${min} min`,
      recentCount: (n: number) => `${n} recent`,
      keepCount: "last 20 kept",
      storedCount: (n: number) => `${n} stored`,
      contentReady: "content available",
      onFirstChange: "on first change",
    },

    tabs: {
      configuration: "Configuration",
      checks: "Checks",
      snapshots: "Snapshots",
    },

    config: {
      title: "Configuration",
      description: "Changes apply to the next check.",
      titleField: "Title",
      titlePlaceholder: "e.g. Subscription pricing",
      urlField: "Page address",
      urlPlaceholder: "https://example.com/pricing",
      selectorField: "CSS selector",
      selectorPlaceholder: "main .price",
      selectorHint: "Restricts monitoring to one precise area of the page.",
      intervalField: "Interval (minutes)",
      intervalHint: "1 minute minimum, 30 minutes by default.",
      ignoreField: "Pattern to ignore",
      ignorePlaceholder: "\\d+ €|last updated",
      ignoreHint: "JavaScript regex left out of the comparison — handy for dates and counters.",
      emailField: "Notification email",
      emailPlaceholder: "you@example.com",
      webhookField: "Webhook",
      webhookPlaceholder: "https://hooks.example.com/...",
      save: "Save",
      updatedLast: "Last updated",
    },

    checks: {
      title: "Check history",
      description: "The last 20 checks on record.",
      empty: "No checks yet. Run one from the top of the page.",
    },

    snapshots: {
      title: "Snapshot history",
      description: "The page state saved at every change, kept for comparison.",
      empty: "No snapshot yet — the first one is created as soon as a change is detected.",
      compareHint: "Compare this snapshot with the newest one",
    },

    diff: {
      title: "Visual comparison",
      description: "Previous version on the left, current version on the right.",
      before: "Before",
      after: "After",
      notEnoughTitle: "Not enough snapshots to compare",
      notEnoughBody: "Two stored states are needed to render a diff.",
      scrollLabel: "Visual comparison",
    },

    notFound: {
      title: "Watch not found",
      description:
        "This page is gone or was deleted. Head back to the dashboard to find your other watches.",
      goBack: "Go back",
    },
  },

  diff: {
    identical: "The two snapshots are identical — nothing to show.",
    added: (n: number) => `${n} added`,
    removed: (n: number) => `${n} removed`,
    split: "Side by side",
    unified: "Line by line",
    splitTitle: "Side-by-side view",
    unifiedTitle: "Line-by-line view",
    before: "Before",
    after: "After",
    hiddenLines: (n: number) =>
      `${n} more ${n === 1 ? "line" : "lines"} hidden to stay responsive.`,
  },

  toast: {
    loadFailed: "Could not load",
    loadFailedDesc: "The page could not be fetched.",
    unknownError: "Something went wrong.",
    retryLater: "Try again in a moment.",

    missingUrl: "Address missing",
    missingUrlDesc: "Paste the address of the page you want to watch.",
    invalidUrl: "that address is not valid",
    added: "Page added",
    addedDesc: "The first check starts shortly.",
    addFailed: "Could not add",
    addFailedDesc: "Check the address and try again.",

    paused: "Watch paused",
    resumed: "Watching again",
    actionFailed: "Action failed",
    deleted: "Watch deleted",

    checkFailed: "Check failed",
    changed: "Change detected",
    changedDesc: "See the diff below.",
    checkImpossible: "Could not run the check",

    saved: "Configuration saved",
    saveFailed: "Could not save",
    checkFields: "check the fields you filled in",
    loadImpossible: "Could not load",
  },

  status: {
    label: {
      OK: "unchanged",
      CHANGED: "changed",
      ERROR: "error",
      SKIPPED: "skipped",
    },
    paused: "Paused",
    neverChecked: "Never checked",
    never: "never",
    justNow: "just now",
    minAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => `${n} ${n === 1 ? "hour" : "hours"} ago`,
    yesterday: "yesterday",
    daysAgo: (n: number) => `${n} ${n === 1 ? "day" : "days"} ago`,
    anyMoment: "any moment now",
    inMin: (n: number) => `in ${n} min`,
    inHours: (n: number) => `in ${n} ${n === 1 ? "hour" : "hours"}`,
    inDays: (n: number) => `in ${n} ${n === 1 ? "day" : "days"}`,
    contentChanged: (from: string, to: string) => `content changed (${from} → ${to})`,
  },
} as const;

export type Strings = typeof strings;
