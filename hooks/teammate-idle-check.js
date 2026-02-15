#!/usr/bin/env node
"use strict";

// TeammateIdle hook: reminds teammates to report status before going idle.
// CRITICAL: Always exit 0 to ALLOW idle. Exit 2 causes infinite loops
// because the teammate sends a message, goes idle again, hook fires again, etc.

let input = "";

process.stdin.setEncoding("utf8");

process.stdin.on("data", function (chunk) {
  input += chunk;
});

process.stdin.on("end", function () {
  let teammateName = "teammate";
  let teamName = "unknown";

  try {
    let event = JSON.parse(input);
    if (event.teammate_name) {
      teammateName = event.teammate_name;
    }
    if (event.team_name) {
      teamName = event.team_name;
    }
  } catch (_e) {
    // If we cannot parse the event, still provide the reminder.
  }

  let message =
    "[TeammateIdle Hook] " + teammateName + " in team \"" + teamName + "\":\n" +
    "Reminder: If you have not already done so, SendMessage to the team lead with:\n" +
    "  (1) What you completed\n" +
    "  (2) What's still pending\n" +
    "  (3) Any blockers\n" +
    "Mark completed tasks via TaskUpdate.\n";

  process.stderr.write(message);
  // Exit 0 = allow idle. NEVER exit 2 — it causes infinite message loops.
  process.exit(0);
});
