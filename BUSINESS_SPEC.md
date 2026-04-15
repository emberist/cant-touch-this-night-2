MiniPanel Business Requirements
About this document

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" in this document are to be interpreted as described in RFC 2119.

Product vision

MiniPanel is a self-hosted analytics platform for product teams. It helps them understand user behavior by collecting events from their applications and providing tools to explore, visualize, and analyze that data.
Think of it as "Mixpanel, but you can run it on your laptop."

Users and their jobs

The product analyst

Core job: "When I ship a feature or run an experiment, I need to understand how users interact with it so I can decide what to do next."
This person opens MiniPanel daily. They ask questions like: how many users clicked the new button this week? Is signups trending up or down? What's the conversion rate from landing page to purchase? They think in terms of events, time ranges, and trends. They want answers in seconds, not hours.

The growth manager

Core job: "When I'm optimizing a user flow, I need to see exactly where users drop off so I can fix the weakest step."
This person builds funnels. They define a sequence of steps (visited pricing page → clicked signup → completed onboarding) and want to see what percentage of users make it through each step. They care about conversion rates and where the biggest drops happen.

The developer

Core job: "When I instrument my app with tracking, I need to verify that events are flowing correctly and the data looks right."
This person sends events to MiniPanel and then checks that they arrived, that the properties are correct, and that identity resolution is working. They need a raw event feed, not charts. They think in terms of payloads and timestamps.

The support lead

Core job: "When a user contacts us with a problem, I need to see their complete activity history so I can understand what happened."
This person looks up individual users. They want to see every event a specific user triggered, in chronological order, with all the context. They need to understand the full journey, including the anonymous part before the user logged in.

Core domain

Events

An event represents something that happened in the user's product. Every event has a name (what happened), a timestamp (when it happened), and an identity (who did it). Events may also carry arbitrary properties that provide context.
Examples of events: a page was viewed, a button was clicked, a purchase was completed, a subscription was renewed.
Properties vary by event type. A "Purchase Completed" event might carry an amount and a currency. A "Page Viewed" event might carry a url and a referrer. Properties can be strings, numbers, or booleans.

Identity

Users interact with products across devices and across sessions. Before they log in, they are anonymous: the only identifier is a device-level ID (like a randomly generated UUID). After they log in or sign up, they have a known identity (like an email or a database ID).
The central problem of analytics is stitching these identities together. A user who browses anonymously on Monday and purchases after login on Tuesday is one person, not two. Getting this wrong means every metric is inflated and every funnel is broken.
MiniPanel follows a simplified identity merge model (inspired by Mixpanel):

* Each event carries a device identity, a user identity, or both.
* When an event carries both, the system creates a permanent mapping: that device belongs to that user.
* Once a mapping exists, all past and future events from that device are attributed to the known user. The merge is retroactive.
* Multiple devices can map to the same user (same person on phone and laptop).
* A device can only belong to one user.
* The resolved identity (the canonical ID for a person) is used everywhere: in charts, funnels, user counts, profiles, and the event explorer.

This is the most important architectural decision in the system. If identity resolution is wrong, every number is wrong.

Requirements

Tier 1, Foundation

The plumbing. No user sees this directly, but nothing works without it.

BR-100: Event collection

The system accepts events from external applications and stores them.

* The system must provide a network API that accepts events.
* Each event must include the event name.
* Each event must include at least one identity (device or user).
* The system must persist events so they survive a restart.
* The system must reject events missing required fields and return a clear error.
* Events may include a timestamp. If omitted, the system must use the current server time.
* Events may include arbitrary key-value properties.

BR-101: Identity resolution

The system stitches anonymous and known identities into a single user.

* The system must maintain a mapping of device identities to user identities.
* When an event contains both a device identity and a user identity, the system must create or confirm this mapping.
* The merge must be retroactive: events previously recorded under an anonymous device must be attributed to the known user once the mapping exists.
* All read operations (queries, aggregations, counts, user lookups) must use the resolved identity.
* A device identity must not map to more than one user identity.
* Multiple device identities may map to the same user identity.

How to verify:

1. Send an anonymous event for device X. Send 3 more anonymous events for device X. Send an identified event linking device X to user Y. Query events for user Y. All 5 events must appear.
2. Send anonymous events for device A and device B. Link both devices to user Z in separate events. Query events for user Z. Events from both devices must appear.

BR-102: Sample data

The system ships with realistic demo data so it's useful out of the box.

* The system must include a way to populate it with sample data.
* The sample data must include at least 5 distinct event types.
* The sample data must include at least 50 resolved users and at least 10,000 events spread over 30 days.
* The distribution must not be uniform. Some users should be more active. Some events should be more common.
* The sample data must include identity resolution scenarios: users who start anonymous and later identify, users with multiple devices, and users who never identify.
* Events must include both string properties (page names, button labels, plan types) and numeric properties (amounts, durations, quantities).

BR-103: Application shell

The system is a web application that starts with one command.

* The system must be a web application with navigation between its main areas.
* The system must start with a single documented command.
* The system must not require external services, API keys, or cloud infrastructure.

How to verify:

1. Clone the repo. Follow only the README. Run the start command. The application must work.

Tier 2, Minimum Viable Product (MVP)

The first moment a user opens the product and gets value.

BR-200: Event exploration

The developer and analyst can browse raw events.

* The user must be able to see events in reverse chronological order.
* Each event must display its timestamp, name, resolved identity, and properties.
* The user must be able to filter events by event name.
* The system must handle large volumes without loading everything at once.

How to verify: 

1. The developer sends an event via the API, then finds it in the explorer by filtering on the event name.

BR-201: Trend analysis

The product analyst can see how event volume changes over time.

* The user must be able to select an event type and see its volume over time.
* The system must support at least two measures: total event count and unique user count (using resolved identities).
* The results must be displayed as a time series chart.
* The user must be able to adjust time granularity. At minimum: daily and weekly.
* The user must be able to select a date range. The system must offer presets (last 7 days, last 30 days, last 90 days) and custom input.
* The default view should show the last 30 days at daily granularity.

How to verify:

1. The analyst sees that "Purchase Completed" events increased after a specific date by looking at the trend chart.
2. The unique users count for an event is lower than the total event count when some users performed the event multiple times. This confirms identity resolution works in aggregations.

Tier 3, Minimum Marketable Product (MMP)

The product is now competitive. A user can do real analysis, not just look at trends.

BR-300: Numeric aggregations

The analyst can measure properties, not just count events.

* When events carry numeric properties (like amount or duration), the user must be able to aggregate by sum, average, minimum, and maximum.
* Example: "Purchase Completed" → sum of amount → total revenue over time.
* Example: "Purchase Completed" → average of amount → average order value over time.
* The system should detect which properties are numeric and offer appropriate options.
* The system must not offer numeric aggregations for non-numeric properties.

How to verify:

1. The analyst selects "Purchase Completed" and measures "sum of amount." The chart shows correct daily revenue totals.

BR-301: Comparative visualization

The analyst can see data in the format that best fits their question.

* The user should be able to switch between different chart types for the same data.
* The system should support at minimum: line chart (for trends), bar chart (for comparisons), and one additional type (area, pie, or data table).
* The system should choose sensible defaults. Line for time series. Pie only when showing proportions.

BR-302: Dimensional breakdown

The analyst can slice any analysis by a property.

* The user must be able to break down any analysis by a property value.
* Example: "Button Clicked" broken down by button_name → one series per button.
* Breakdowns must work with all available measures (counts, unique users, numeric aggregations).
* The system should limit breakdowns to the top values and group the rest, to keep charts readable.

How to verify:

1. The analyst breaks down "Page Viewed" by page. The chart shows separate series for the top pages.

BR-303: Funnel analysis

The growth manager can see where users drop off in a flow.

* The user must be able to define a sequence of 2 to 5 events.
* The system must compute the conversion rate between each consecutive pair of steps and the overall rate.
* The results must be displayed visually, showing where users drop off.
* Funnels must use resolved identities. A user who performs step 1 anonymously and step 2 after login must count as a single user progressing through the funnel.
* Step order must be respected by timestamp within the selected date range.

How to verify:

1. The growth manager builds a funnel: "Page Viewed" → "Signup Completed" → "Purchase Completed." A user who viewed the page anonymously and signed up with a known identity appears as one user, not a dropout.

BR-304: User profiles

The support lead can look up any user and see their full history.

* The user must be able to look up an individual by their identity.
* The profile must show all events attributed to this person, including anonymous events merged via identity resolution.
* The profile must display the identity cluster: all device identities and the user identity linked together.
* The profile should show first seen and last seen timestamps.

How to verify:

1. The support lead searches for "charlie@example.com" and sees events from both their phone (device A) and laptop (device B) in a single timeline.

BR-305: Visual coherence

The system looks and feels like a real product.

* The system should present a consistent visual language: color palette, typography hierarchy, readable chart labels.
* The system should handle edge cases: empty states, loading indicators, error messages.
* The system should not show blank pages, raw error dumps, or broken layouts when data is missing.

Tier 4, Nice to have

Power-user features and quality-of-life improvements.

BR-400: Saved analyses

The analyst may be able to save an Insights query or funnel with a name and reload it later.

BR-401: Input assistance

Event and property selectors may support search and autocomplete based on data in the system.

BR-402: Multi-event comparison

The analyst may be able to place multiple event types on the same chart for direct comparison.

Hard constraints

* The system must run locally on a single machine.
* The system must start with a single documented command.
* The system must not require external API keys, paid services, or third-party accounts.
* The system must not require user authentication.
* The codebase must include at least one automated test that verifies identity resolution.

