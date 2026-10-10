# @deepseek-ai/dsh-client-gray-claw

Web sidebar foot entry that opens one fixed-id persistent session ("Gray").
The button registers into the shell-declared `sidebar.footer.action` list
slot; clicking selects the session when it exists and creates it (with the
preallocated id) otherwise. Gray is an ordinary host session, so the standard
conversation UI carries the chat, tool, and memory surface — this package
renders the trigger only.

## Model Experience

No model-visible effect: the plugin adds one UI trigger and one host session
created on demand; prompts, tools, and session logs are unchanged.
