# @deepseek-ai/dsh-client-gray-claw

**Retired (not mounted).** The persistent Gray session's entry moved to the `我的助理` nav row, which `gray-assistant` binds to that Session through ui-sidebar's `ctx.navSessions` — a nav row can stand for a Session, so the sidebar foot no longer needs a trigger. The web-app bundle patch no longer lists this row; re-add `gray-claw` there to restore the foot button.

Web sidebar foot entry that opens one fixed-id persistent session ("Gray"). The button registers into the shell-declared `sidebar.footer.action` list slot; clicking selects the session when it exists and creates it (with the preallocated id) otherwise. Gray is an ordinary host session, so the standard conversation UI carries the chat, tool, and memory surface — this package renders the trigger only.

## Model Experience

No model-visible effect: the plugin adds one UI trigger and one host session created on demand; prompts, tools, and session logs are unchanged.
