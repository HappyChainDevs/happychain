# Randomness Monitor

This application monitors the randomness service by directly inspecting the blockchain to verify whether randomness data
is included in each block.

The results are stored in a SQLite database and visualized via Grafana on the following dashboard (Happy Devs team only):

🔗 [View Dashboard](https://grafana.happy.tech/goto/BMpaDZbNg?orgId=1)

In addition to visualization, the collected data is used to trigger alerts when the randomness service's performance
drops below 95% block coverage.