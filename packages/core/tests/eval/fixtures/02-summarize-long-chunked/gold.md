Two senior engineers, Alex and Jordan, debate whether to build vs buy a feature-flagging system for their mid-sized SaaS company (50,000 active users, ~50 flags), with Alex pushing build (~120 engineering hours, ~$300/month infra, ~$75K total over 3 years) and Jordan pushing buy (LaunchDarkly enterprise at $2,400/month, or starter at $150/month for 10 flags).

- **Build case (Alex):** complete control, no vendor lock-in, modifiable for internal analytics pipeline; estimated 3 sprints + Redis/Postgres/GraphQL stack at $300/month infra.
- **Buy case (Jordan):** zero maintenance burden, proven track record with IBM/Intuit, included SDKs/monitoring/support; argues 80 hrs/month maintenance + opportunity cost of pulling 3 senior engineers off customer features.
- **Vendor mentions:** LaunchDarkly (enterprise $2,400/mo, starter $150/mo with 10-flag cap), Statsig, Flagsmith.
- **Concession moment:** Jordan acknowledges they probably don't need 10,000 flags — only ~50 active flags at any given time — accepting Alex's "overpaying for kitchen sink" framing in part.
- **Resolution:** evaluate against a cost model and pick a plan that scales to actual needs, not hypotheticals; the underlying tension is "we are a document collaboration tool, not an infrastructure company" vs "we want full control and no vendor outage exposure".
