---
"@happy.tech/iframe": minor
---

The activity view now handles failed transactions correctly (won't stay stuck in pending), previous pending transactions are monitored on new load, and the ordering of transactions is now mostly chronological (race conditions are possible when spamming).
