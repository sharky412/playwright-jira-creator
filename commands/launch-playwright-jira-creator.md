---
description: Reproduce a Jira bug and record it as a verified Playwright bug-recorder test (e.g. /launch-playwright-jira-creator PROJ-12345)
argument-hint: JIRA-ID
---

Use the `playwright-jira-creator` skill (`.claude/skills/playwright-jira-creator/SKILL.md`) to run the full workflow for Jira issue **$ARGUMENTS**:
read the ticket and its documented root cause, choose the environment, reproduce the bug in the browser, write
`tests/$ARGUMENTS.spec.ts` with its data file asserting the current buggy behaviour, run and verify it in Chrome/Firefox,
clean up all test data, review the diff and give the final report.

If no Jira ID was given, ask for it before doing anything else.
