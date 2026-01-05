# Strategic Blueprint and Technical Architecture for Parc Fermé: The Social Cataloging Platform for Motorsport

## 1\. Executive Vision and Product Philosophy

### 1.1 The "Memory Hole" in Modern Motorsport

The contemporary landscape of motorsport consumption is characterized by a paradox of abundance and ephemerality. Fans have unprecedented access to live timing, telemetry, on-board cameras, and 24/7 news cycles through platforms like _PlanetF1_, _Sky Sports_, and official series apps.<sup>1</sup> Yet, the moment the chequered flag falls, the experience evaporates. The discourse fragments into fleeting threads on Reddit, Twitter/X, and Discord, where it is rapidly buried by the next news cycle. There is currently no centralized "cultural memory" for racing-no persistent digital library where a fan can catalog their journey through the sport, curate their history, or engage in retrospective discovery.

"Parc Fermé" addresses this fundamental gap by adapting the "social cataloging" model-successfully pioneered by Letterboxd for film <sup>3</sup> and Goodreads for literature-to the specific nuances of motorsport. The vision is to build a platform that serves as the definitive "diary" for racing fans. This is not merely a statistical database; statistics are objective and cold. Parc Fermé is designed to capture the _subjective_ human experience of racing: the tension of a strategic duel, the atmosphere of a rainy afternoon at Spa-Francorchamps, or the specific nostalgia of a classic V10-era Grand Prix re-watched years later.

### 1.2 Core Value Proposition: The "Watched" vs. "Attended" Duality

The defining innovation of Parc Fermé, distinguishing it from general media trackers, is the recognition that motorsport is consumed in two radically different modalities:

- **The Broadcast Experience ("Watched"):** This is the dominant mode for global fans. It focuses on the narrative, the TV direction, the commentary, and the on-track action. A fan watching the 2021 Belgian Grand Prix (the "race that never happened") on TV might rate it 1/5 stars due to the lack of action.
- **The Live Experience ("Attended"):** This is the experiential mode. That same fan attending the 2021 Belgian Grand Prix might rate the experience 4/5 stars, citing the camaraderie in the mud, the trackside atmosphere, and the resilience of the fans, despite the lack of racing cars.<sup>5</sup>

Existing platforms typically service only one of these dimensions. _RaceRaves_ focuses on participant reviews for runners <sup>7</sup>, while _F1Destinations_ provides static travel guides.<sup>9</sup> Parc Fermé unifies them. By allowing users to log a single event with distinct "Broadcast" and "Venue" ratings, the platform builds a multi-dimensional dataset that serves both the armchair historian and the traveling spectator.

### 1.3 The "Side Project" Mandate

As this project is intended to be a viable side project, the architectural strategy detailed in this report prioritizes:

- **Low Operational Overhead:** Leveraging open-source data (OpenF1) and community contribution to minimize initial API costs.<sup>10</sup>
- **Scalability:** A schema design that accommodates F1 initially but is built to ingest MotoGP, IndyCar, and WEC without refactoring.
- **High User Retention:** Gamification mechanics and "spoiler-free" design patterns to make the app a daily habit rather than a weekend-only utility.

## 2\. The Market for "Memory": Why Motorsport Needs a Letterboxd

### 2.1 The "Letterboxd Effect" and Cultural Curation

To understand the viability of Parc Fermé, we must analyze the "Letterboxd Effect." The film platform did not invent movie reviews; it democratized curation. It shifted the center of gravity from authoritative critics (Rotten Tomatoes) to peer-to-peer discovery. Key drivers of this success included the ability to create lists (e.g., "movies that feel like a warm hug"), the "diary" feature (tracking consumption over time), and the social graph (following users with similar taste).<sup>3</sup>

In motorsport, the "unit of content" is the Race Weekend. Fans currently lack the tools to curate this content. There is a palpable demand for lists like:

- "The Best Wet Races of the V10 Era"
- "Every Race Where Lewis Hamilton Won from Outside the Top 5"
- "IndyCar Races with the Most Overtakes"
- "Tracks with the Best General Admission Views"

By providing the infrastructure for this curation, Parc Fermé empowers the community to organize the chaotic history of motorsport into accessible entry points for new fans (driven by _Drive to Survive_) and nostalgic archives for veterans. This User-Generated Content (UGC) becomes a powerful organic growth engine, as highly shared lists act as SEO magnets.<sup>3</sup>

### 2.2 Competitive Landscape and Gap Analysis

The motorsport digital ecosystem is crowded, but specific niches remain underserved.

| **Segment** | **Key Players** | **Primary Focus** | **Limitations for Social Cataloging** |
| --- | --- | --- | --- |
| **Direct competition** | [_BoxBoxd_](https://boxboxd.fun/) | F1 Race logging, personal and social analytics. | F1-only; lacks multi-series support; limited "Attended" experience features. I dont think this developer really knows what theyre doing. It's lacking the stuff you NEED, no privacy policy, no terms of service, no about page, nothing. Yet it does already have a monetized "Pro" offering which allows users to use the full F1 History, we MUST do better than this and offer ALL data for free. 
| **Statistical Analysis** | _TracingInsights_ <sup>12</sup>, _FastF1_ <sup>13</sup> | Telemetry, lap times, gap analysis. | Extremely technical; lacks emotional/narrative rating; no "diary" function. |
| **News Aggregators** | _PlanetF1_ <sup>1</sup>, _Sky Sports_ <sup>2</sup> | Breaking news, rumors, live blogs. | Ephemeral content; focuses on the "now," not the archive; no user profiles. |
| **Venue Guides** | _F1Destinations_ <sup>9</sup>, _Grand Prix Grand Tours_ <sup>5</sup> | Logistics, tickets, travel advice. | Static "Web 1.0" information; lacks dynamic user reviews or social interaction. |
| **Fan Voting** | _F1 Hot or Not_, Reddit Polls <sup>14</sup> | Post-race sentiment measurement. | Aggregated data only; users cannot track their _own_ history; polls close after a week. |
| **Fantasy/Betting** | _Gridlock_ <sup>15</sup>, _Fantasy GP_ <sup>16</sup> | Prediction, competition. | Forward-looking (predicting results) rather than retrospective (reviewing experiences). |

**The Gap:** Parc Fermé occupies the white space between these segments. It combines the historical depth of statistical sites, the user-centricity of social platforms, and the utility of venue guides.

### 2.3 User Personas

Successful product design requires clear target personas.

- **The Archivist (The "Letterboxd" User):** Wants to track every race they watch. They care about their "Year in Review" stats. They re-watch old seasons during the winter break. _Needs: Quick logging, robust search, seasonal stats._
- **The Traveler (The "TripAdvisor" User):** Attends 1-3 races a year. Wants to know which grandstand has a view of a TV screen and where the good food stalls are. _Needs: Venue ratings, seat-view photos, logistical tips._
- **The Newcomer (The "DTS" Fan):** Overwhelmed by history. Wants recommendations on what to watch to understand the sport's legacy. _Needs: Curated lists ("Essential 90s Races"), spoiler-free interfaces._

## 3\. The "Watched" vs. "Attended" Experience Duality

### 3.1 Deconstructing the Broadcast Rating ("Watched")

The "Watched" rating is the platform's bread and butter. Unlike a film, a race is a dynamic sporting event. The rating criteria must reflect this. A simple 5-star scale is necessary for the aggregate, but the review interface should encourage nuance.

- **Narrative Arc:** Was the championship battle impacted? (e.g., Abu Dhabi 2021).
- **On-Track Action:** Overtaking quality, battles for the lead, midfield chaos.
- **Strategic Tension:** Undercuts, tyre degradation drama, weather variables.
- **Production Quality:** Direction, commentary (broadcast feeds vary by region, e.g., Sky UK vs. F1TV vs. Canal+).

**Data Point:** Research indicates that fans use tools like _istheraceworthwatching.com_ (now _ITRWW_) to decide if a past race is worth their time.<sup>14</sup> This proves the utility of a spoiler-free "excitement rating." Parc Fermé elevates this by attaching the rating to a specific user profile, adding social trust to the recommendation.

### 3.2 Deconstructing the Venue Rating ("Attended")

This feature transforms Parc Fermé into a logistical utility. Attending a Grand Prix is a significant financial investment. User reviews become a critical decision-making tool for others.

- **View Quality:** Sightlines, visibility of catch fencing, proximity to big screens.
- **Atmosphere:** Crowd energy, "Tifosi" presence, post-race concerts.
- **Facilities:** Toilet access, food quality/price, water refill stations.
- **Access:** Traffic management, shuttle buses, walking distance (e.g., the 2km walk at Suzuka <sup>17</sup>).

**Integration:** A user logging an "Attended" race should be prompted to upload a "View from Seat" photo. This builds a crowdsourced database of seat views, similar to _SeatGeek_ or _ViewFromMySeat_, but specific to racing circuits which often change layouts or grandstand names year-to-year.

### 3.3 Visualizing the Split

The UI must clearly distinguish these ratings. A race might have a **2.1/5** "Watch Score" (boring procession) but a **4.8/5** "Event Score" (incredible festival atmosphere).

- **Use Case:** A user considering buying tickets for the Miami GP checks Parc Fermé. They see the racing is often rated low, but the event experience is rated high. They make an informed purchase decision based on their priority (party vs. racing).

## 4\. Multi-Series Data Strategy: The Technical Foundation

Building a "side project" requires a pragmatic data strategy that balances cost with coverage. The complexity varies significantly by racing series.

### 4.1 Formula 1: The Gold Standard

F1 data is the most accessible and structured, making it the ideal starting point for the MVP (Minimum Viable Product).

- **OpenF1 (Primary Source):**
  - **Status:** Free, open-source API.<sup>10</sup>
  - **Capabilities:** Provides real-time and historical data including lap times, telemetry, and race control messages.<sup>10</sup>
  - **Endpoints:** sessions endpoint allows filtering by year and type (Race, Qualifying). Crucially, it provides a meeting_key which groups sessions into a unified "Event".<sup>19</sup>
  - **Strategy:** Use OpenF1 for the current season and recent history (2018-Present). It is "unofficial," so relying solely on it for critical infrastructure carries a longevity risk (similar to the Ergast sunset <sup>20</sup>).
- **Ergast (Legacy Integration):**
  - **Status:** While depreciating, its data structure is the schema standard for historical data (1950-2023).<sup>21</sup>
  - **Strategy:** Import the full Ergast database dump (CSV/SQL) to seed the historical archive. This provides the "backbone" of history without needing active API calls.
- **SportMonks (Commercial Upgrade):**
  - **Status:** Paid API (~€55/month).<sup>22</sup>
  - **Capabilities:** High reliability, includes "Team" and "Driver" tables with images and logos.
  - **Strategy:** If the project generates revenue, migrate to SportMonks to offload the maintenance burden of scraping or cleaning open data.<sup>23</sup>

### 4.2 Expansion Series: MotoGP, IndyCar, WEC

Scaling beyond F1 introduces data fragmentation.

- **MotoGP:**
  - **Challenge:** No official public API. Community projects like _motogp-results-manager_ rely on scraped Kaggle datasets or static files.<sup>24</sup>
  - **Solution:** Implement a "Community Contribution" model. Allow trusted users (moderators) to create race entries manually if they don't exist. This "Wiki" approach is essential for niche series where APIs are non-existent.
- **IndyCar:**
  - **Challenge:** Data is locked behind expensive commercial APIs (SportRadar) or within the app.<sup>26</sup>
  - **Solution:** Utilize community-maintained JSON repositories (e.g., _neherdata_ on GitHub) that parse the app's internal feeds.<sup>28</sup> This is fragile but sufficient for a side project.
- **WEC (Endurance):**
  - **Challenge:** Races are time-based (6h, 24h), not just lap-based. The concept of a "driver" is fluid as cars have shared line-ups (3 drivers per car).
  - **Solution:** The database schema must support participants as "Teams" (Car #51) linked to multiple "Drivers." Reviews are often logged against the "Car" rather than a specific driver.

### 4.3 Data Ingestion Pipeline Design

The system requires an "Ingestion Engine" written in Python (due to strong library support like _FastF1_ and _SportsDataverse_ <sup>29</sup>).

- **Scheduler:** A cron job runs every Monday morning (GMT).
- **Fetch:** Queries OpenF1 (or SportMonks) for the previous weekend's results.
- **Normalization:** Converts the API response into the Parc Fermé internal schema (mapping "Max Verstappen" to driver_id: 33).
- **Asset Generation:** Fetches a generic circuit map image if a specific race thumbnail isn't available.
- **Spoiler Flagging:** Marks the result data as hidden by default in the database until the "Spoiler Embargo" lifts or the user interactions trigger a reveal.

## 5\. Database Schema and Backend Architecture

A robust relational database is non-negotiable. NoSQL solutions (MongoDB) are often marketed for flexibility, but the highly interconnected nature of racing data (Drivers drive for Teams in Races at Circuits in Seasons) demands a Relational Database Management System (RDBMS) like PostgreSQL.

### 5.1 Entity-Relationship Model (ERD)

Consider all of this as a high-level overview. The actual implementation will require further normalization and indexing for performance.

#### 5.1.1 The "Event" Cluster (Objective Reality)

This cluster defines the immutable facts of the sport.

| **Table Name** | **Primary Key** | **Critical Columns** | **Notes** |
| --- | --- | --- | --- |
| **Series** | series_id | name (F1, Indy), slug | Top-level hierarchy. |
| **Season** | season_id | series_id, year | e.g., "F1 2024". |
| **Round** | round_id | season_id, circuit_id, name, date_start, date_end | The "Weekend" container (e.g., British GP). |
| **Session** | session_id | round_id, type (FP1, Quali, Race), start_time (UTC) | The actual rate-able unit. |
| **Circuit** | circuit_id | name, location, country, layout_map_url | Holds geolocation data for maps. |
| **Entrant** | entrant_id | round_id, driver_id, team_id, car_number | Links drivers to teams for _specific_ races. |
| **Result** | result_id | session_id, entrant_id, position, status, points | **SPOILER DATA** (Must be protected). |

#### 5.1.2 The "Social" Cluster (Subjective Experience)

This cluster stores the user-generated content.

| **Table Name** | **Primary Key** | **Critical Columns** | **Notes** |
| --- | --- | --- | --- |
| **User** | user_id | username, email, avatar_url, settings_json | Settings include spoiler_mode preference. |
| **Log** | log_id | user_id, session_id, rating (1-10), date_logged | The core "Diary" entry. |
| **Review** | review_id | log_id, body_text, contains_spoilers (bool), language | Text content of the log. |
| **Experience** | exp_id | log_id, is_attended (bool), seat_location, view_rating | Metadata for attended races. |
| **List** | list_id | user_id, title, description, is_public | Ordered collection of sessions/rounds. |
| **ListItem** | item_id | list_id, session_id, order_index, comment | The contents of a list. |

### 5.2 Handling "Time" and Spoilers in the Schema

One of the most complex aspects is preventing spoilers at the database query level.<sup>31</sup>

- **The "Spoiler View" Pattern:** Create a database view or an API serializer that conditionally returns result data.
  - _Query:_ GET /api/races/1234
  - _Logic:_ Check request.user.logs.filter(session_id=1234).exists().
  - _If True:_ Return full object with result: { winner: "Hamilton" }.
  - _If False:_ Return masked object result: { winner: null, status: "completed" }.
- **Images:** Circuit images must be generic by default. "Winner" photos (e.g., driver holding trophy) can only be served if the spoiler check passes.

### 5.3 Technology Stack

- **Backend:** **.NET 10 (ASP.NET Core 10/)**. High performance, strong typing, excellent support for REST APIs, and a rich ecosystem for authentication/authorization using both JWT and OAuth2 (We will ship with Google/Discord login initially and expand later).
- **Database:** **PostgreSQL**. Robust, supports JSONB (for flexible metadata like "weather conditions"), and has powerful geospatial extensions (PostGIS) if you want to implement "find circuits near me" features later.
- **ORM:** **Entity Framework Core 10**. Simplifies database interactions with LINQ, supports migrations, and integrates seamlessly with .NET.
- **Cache:** **Redis**. For session caching, rate limiting, and storing ephemeral data (e.g., spoiler flags).
- **Frontend:** **React 18** with **TypeScript**. Component-based architecture allows for reusable UI elements (e.g., Rating Stars, Review Cards). TypeScript adds type safety, reducing runtime errors.
- **State Management:** **Redux Toolkit**. Manages global state (user auth, spoiler preferences) efficiently.
- **Styling:** **Tailwind CSS**. Utility-first CSS framework for rapid UI development with a consistent design system.
- **Mobile:** **React Native** (or Flutter). A mobile-first approach is critical. Most users will log races while on the couch or at the track. React Native allows deploying to iOS and Android from a single codebase while maintaining a "native" feel.
- **Search:** **Elasticsearch**. For advanced search capabilities (filtering by tags, full-text search in reviews), Elasticsearch provides the necessary speed and flexibility.

## 6\. User Experience Design: The "Spoiler-Free" Imperative

The UX of Parc Fermé must differ fundamentally from Twitter or Reddit. It must be a "Safe Space" for the delayed viewer.

### 6.1 The "Anti-Spoiler" Interface

- **Blurred Feeds:** By default, the activity feed (showing friends' reviews) should blur images and text summaries for any race the user hasn't logged as "Watched."
- **The "Sensory Deprivation" Mode:** A toggle in settings. When active, the app opens directly to the "Log" screen, bypassing the "Feed" entirely. This allows a user to log a race immediately after watching without risking seeing a friend's review that says "Can't believe Max DNF'd!".
- **Score Hiding:** Much like _istheraceworthwatching.com_ <sup>14</sup>, users should be able to see an "Excitement Rating" (Aggregate Score) without seeing the result.
  - _Visual Cue:_ A color-coded bar (Red = Boring, Green = Thriller) rather than a number that implies a specific outcome.

### 6.2 The Logging Flow (Wireframe Concept)

- **Search/Identify:** User searches "Monaco" -> Selects "2024 Monaco Grand Prix".
- **Context Modal:** "Did you Watch this or Attend this?" (Two distinct buttons).
- **The Rating Matrix (Watched):**
  - Star Rating (0.5 - 5.0).
  - "Like" Heart (Binary sentiment).
  - Date Watched (Defaults to today, user can backdate for archives).
  - Tags: #Rain #Strategy #RedFlag #OvertakeFest.
- **The Rating Matrix (Attended):**
  - _All of the above, plus:_
  - Venue Rating (1-5).
  - "Where did you sit?" (Dropdown of Grandstands + "General Admission").
  - "View Photo" (Camera roll upload).
- **The Review:** Text input. Toggle "Contains Spoilers" (Checked by default for recent races to encourage safety).
- **Publish:** animation of a checkered flag or pit stop light sequence.

### 6.3 The Circuit Guide Integration

The "Attended" data aggregates into the Circuit Guide pages.

- **Seat Map:** Overlay user ratings on an SVG map of the track. Clicking "Turn 1 Grandstand" shows the average rating and a gallery of user photos from that specific location.
- **Travel Tips:** A "Wiki" section on the Circuit page where users can upvote tips (e.g., "Park in Lot C to avoid traffic").

## 7\. Community Dynamics, Growth, and Gamification

### 7.1 The "Cold Start" Problem and Solution

A social network without users is a ghost town. The strategy to overcome this is "Single-Player Utility."

- **Utility First:** Even with zero friends, the app is useful as a personal tracking tool and a database of "Which race should I watch next?"
- **Import Tools:** Build a "Letterboxd Importer" or "CSV Importer." Allow users to export their history from other tools (or spreadsheets) to instantly populate their profile.
- **The "Pro" Seed:** Manually populate the database with "Essential" lists created by the admin or sourced (with credit) from reputable journalists. "The Autosport Top 50 Drivers" or "The Race's Best Duels" as starter lists.

### 7.2 Gamification: The "Passport" Concept

Motorsport fans love stats. Parc Fermé should lean into "Quantified Fandom."

- **The Superlicence:** The user profile isn't just a page; it's a "Superlicence."
  - **XP System:** Log races -> Gain XP -> Level up (F4 -> F3 -> F2 -> F1).
- **Badges (Stickers):**
  - _Globe Trotter:_ Logged "Attended" reviews in 3 different continents.
  - _Iron Fan:_ Watched every session (FP1, FP2, FP3, Quali, Race) of a weekend.
  - _Historian:_ Logged 5 races from the 1980s.
- **Stats Dashboard:** "You watched 64 hours of racing this year. Your most watched team is Ferrari. Your average rating for Wet Races is 4.2."

### 7.3 Influencer Strategy

The "Letterboxd Effect" exploded when directors and stars joined. In racing, drivers are often restricted by PR, but **Sim Racers**, **YouTubers**, and **Journalists** are the target.

- **Verified Accounts:** Give badges to known F1 content creators (e.g., Chain Bear, Tiametmarduk).
- **Guest Lists:** "Jimmy Broadbent's Top 5 Chaos Races." These lists are highly shareable on social media, driving traffic back to the platform.<sup>3</sup>

## 8\. Business Model, Monetization, and Viability

Running a database-heavy site has costs (storage, bandwidth, APIs). Monetization must be present but unobtrusive to avoid alienating the community.

### 8.1 Freemium vs. "Paddock Club" (Pro Tier)

The Letterboxd "Pro/Patron" model is the blueprint.<sup>33</sup>

- **Free Tier:** Unlimited logging, ads (banner), basic stats.
- **"Pit Wall" (Pro - \$4/mo):**
  - Ad-free experience.
  - Advanced Filtering (Filter lists by "Streaming Service availability").
  - Profile Header customization (Upload a cover photo of your favorite car).
  - Early access to new features.
- **"Paddock Club" (Patron - \$10/mo):**
  - Beta access.
  - "Supporter" Badge on profile.
  - Priority support.

### 8.2 Affiliate Revenue (Contextual Commerce)

This is potentially the highest revenue driver.

- **Ticket Affiliates:** On the "Monza Circuit Guide" page, the "Buy Tickets" button uses an affiliate link to a partner like _P1 Travel_ or _Motorsport Tickets_.<sup>5</sup> The high conversion intent of a user looking at seat views makes this valuable.
- **Merchandise:** Links to retro team shirts on "Vintage Race" pages.
- **Sim Racing:** Links to the track DLC (e.g., iRacing/Assetto Corsa) for the circuit the user is viewing.

### 8.3 Cost Analysis (Estimates for Side Project)

- **Hosting (Vercel/Heroku/Render):** Free tier initially, scaling to ~\$50/mo for moderate traffic.
- **Database (Supabase/Neon):** ~\$25/mo for managed PostgreSQL.
- **Image Storage (AWS S3/Cloudinary):** The biggest variable cost (user photos). Budget ~\$20-50/mo initially.
- **APIs:** OpenF1 is free. SportMonks F1 is ~€55/mo.
- **Total Monthly OpEx:** ~\$100 - \$150. Break-even requires ~30-40 "Pit Wall" subscribers.

## 9\. Legal, Compliance, and Intellectual Property

### 9.1 Trademark and Naming

- **"Box Box":** This is a generic racing term (radio instruction to pit). It is likely descriptive and difficult for F1 to trademark broadly, but "Parc Fermé" as a specific brand name is likely defensible.
- **Risk:** _Formula One Licensing B.V._ is notoriously aggressive protecting the "F1" and "Formula 1" trademarks.<sup>11</sup>
  - _Mitigation:_ Never use the official F1 logo. Use the term "Grand Prix" or "Formula Racing" in marketing copy where possible. Ensure the app disclaimer states "Unofficial and not associated with Formula 1 companies".<sup>11</sup>

### 9.2 API Terms of Service

- **OpenF1:** Generally permissive but check for "commercial use" restrictions if you introduce subscriptions.
- **Scraping:** If scraping data (e.g., for MotoGP), ensure you are not violating the robots.txt or ToS of the source site. Using "Fact" data (dates, results) is generally not copyrightable, but the _collection_ structure can be protected in some jurisdictions (EU Database Directive).
- **GDPR/CCPA:** As a social platform storing user data (email, location habits), strict compliance is required. Implement "Delete My Data" and "Export My Data" features from Day 1.<sup>36</sup>

## 10\. Implementation Roadmap: From MVP to Platform

### Phase 1: The "Shakedown" (Months 1-3)

- **Scope:** F1 only. Current Season (2025) + 2024.
- **Features:** Basic Logging (Watched/Attended), Profile Page, simple Search.
- **Data:** OpenF1 integration.
- **Goal:** 100 Beta users. Prove the "Log a Race" flow is fun.

### Phase 2: The "Midfield" (Months 4-6)

- **Scope:** F1 Historical Archive (1950-2023).
- **Features:** Lists, Follow/Social Feed, Spoiler "Safe Mode."
- **Data:** Import Ergast database.
- **Goal:** Public launch. 1,000 users.

### Phase 3: The "Podium" (Months 6-12)

- **Scope:** Multi-Series (IndyCar, WEC).
- **Features:** "Attended" Venue Guides (Seat Maps), Gamification (Badges), Pro Subscription.
- **Data:** Community contribution tools for non-F1 series.
- **Goal:** Revenue generation (Break-even).

## Conclusion

Parc Fermé is not just a database; it is a platform for _identity_. For the racing fan, their history-the rainy days at Silverstone, the sleepless nights watching Suzuka, the heartbreak of a DNF-is part of who they are. By building the digital infrastructure to house these memories, Parc Fermé has the potential to become the "Goodreads of Racing," a sticky, high-retention utility that serves the fan first. The path is technically feasible through open data and strategically sound due to the clear gap in the "experiential" market. The project is ready for the green light.

#### Works cited

- PlanetF1.com: F1 News, Live Race Coverage, Results & Standings, accessed January 1, 2026, <https://www.planetf1.com/>
- F1 News, Drivers, Results - Formula 1 Live Online | Sky Sports, accessed January 1, 2026, <https://www.skysports.com/f1>
- Letterboxd Marketing Strategy: Building Community | NoGood, accessed January 1, 2026, <https://nogood.io/blog/letterboxd-marketing/>
- Beyond the Mainstream: How Letterboxd is Reshaping Film Culture & What Brands Can Learn from This - YouScan, accessed January 1, 2026, <https://youscan.io/blog/how-letterboxd-is-reshaping-film-culture/>
- What is the Best Grand Prix to Attend? Comparing F1 Atmospheres and Experiences, accessed January 1, 2026, <https://www.grandprixgrandtours.com/blog/what-is-the-best-grand-prix-to-attend/>
- r/formula1 Wiki: F1 Circuit Guide - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/formula1/wiki/circuitguide/>
- Tips & Tricks: Reviewing a Race - RaceRaves, accessed January 1, 2026, <https://raceraves.com/tips-reviewing-races/>
- The Power and Promise of Race Reviews - RunSignup, accessed January 1, 2026, <https://info.runsignup.com/2024/06/07/the-power-and-promise-of-race-reviews/>
- RANKED: Top Ten 2025 F1 Races for General Admission Tickets - F1Destinations.com, accessed January 1, 2026, <https://f1destinations.com/top-ten-general-admission-tickets-f1-circuits>
- OpenF1 API - Real-time and historical Formula 1 data - GitHub, accessed January 1, 2026, <https://github.com/br-g/openf1>
- Introduction - OpenF1 API | Real-time and historical Formula 1 data, accessed January 1, 2026, <https://openf1.org/>
- TracingInsights.com - F1 Racing Analytics - Lap Times, Telemetry Data & Race Insights, accessed January 1, 2026, <https://tracinginsights.com/>
- Ergast API is being deprecated at the end of 2024 · theOehrly Fast-F1 · Discussion #445, accessed January 1, 2026, <https://github.com/theOehrly/Fast-F1/discussions/445>
- I made a site to help you decide if last weekend's race is worth watching, with any spoilers! : r/F1TV - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/F1TV/comments/1jm0rvf/i_made_a_site_to_help_you_decide_if_last_weekends/>
- accessed January 1, 2026, <https://apps.apple.com/us/app/gridlock-race-predictions-app/id6736937071#:~:text=Gridlock%3A%20The%20Race%20Prediction%20App,friends%2C%20and%20win%20fantastic%20prizes>!
- Fantasy GP » Fantasy F1 Game » 2025 Season Open!, accessed January 1, 2026, <https://fantasygp.com/>
- F1 and Japan: An honest guide of the Japanese Grand Prix. | by Evan Nusantoro - Medium, accessed January 1, 2026, <https://medium.com/@evannusantoro/f1-and-japan-an-honest-guide-of-the-japanese-grand-prix-4d459810eca1>
- OpenF1 - An API for real-time F1 data : r/F1DataAnalysis - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/F1DataAnalysis/comments/16w84uz/openf1_an_api_for_realtime_f1_data/>
- Using OpenF1 with authentication, accessed January 1, 2026, <https://openf1.org/auth.html>
- Access Formula 1 Data • f1dataR, accessed January 1, 2026, <https://scasanova.github.io/f1dataR/>
- Ergast F1 API Alternatives (2025) - Best Sports & Fitness APIs - Public APIs, accessed January 1, 2026, <https://publicapis.io/alternatives/ergast-f1-api>
- The Leading Formula One API for F1 Data - Sportmonks, accessed January 1, 2026, <https://www.sportmonks.com/formula-one-api/>
- Get started with Sportmonks: the best free sports api for developers, accessed January 1, 2026, <https://www.sportmonks.com/blogs/get-started-with-sportmonks-the-best-free-sports-api-for-developers/>
- cacara82/motogp-results-manager: An open MotoGP stats ... - GitHub, accessed January 1, 2026, <https://github.com/cacara82/motogp-results-manager>
- MotoGP stats/lap times/etc in computer-readable format? - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/motogp/comments/l09nwm/motogp_statslap_timesetc_in_computerreadable/>
- Sportradar IndyCar v2 | Get Started | Postman API Network, accessed January 1, 2026, <https://www.postman.com/sportradar-media-apis/sportradar-media-apis/collection/j9ohpqj/sportradar-indycar-v2>
- Telemetry data download? : r/INDYCAR - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/INDYCAR/comments/15q27ct/telemetry_data_download/>
- neherdata/2024-indycar-longbeach-data - GitHub, accessed January 1, 2026, <https://github.com/neherdata/2024-indycar-longbeach-data>
- sdv-py - SportsDataverse, accessed January 1, 2026, <https://sportsdataverse-py.sportsdataverse.org/>
- sportsdataverse python package - GitHub, accessed January 1, 2026, <https://github.com/sportsdataverse/sportsdataverse-py>
- Protecting Databases from Schema Disclosure - SciTePress, accessed January 1, 2026, <https://www.scitepress.org/papers/2016/59674/59674.pdf>
- Getting Started - sdv-py - SportsDataverse, accessed January 1, 2026, <https://sportsdataverse-py.sportsdataverse.org/docs/intro>
- uraimo/awesome-software-patreons: A curated list of awesome programmers and software projects you can support! - GitHub, accessed January 1, 2026, <https://github.com/uraimo/awesome-software-patreons>
- RANKED: Top 10 F1 Races to Attend in 2025 for Trackside Views - GPDestinations.com, accessed January 1, 2026, <https://gpdestinations.com/ranked-top-10-f1-races-to-attend-trackside-views/>
- r/fantasyF1 - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/fantasyF1/>
- leepeuker/movary: Self hosted web app to track and rate your watched movies - GitHub, accessed January 1, 2026, <https://github.com/leepeuker/movary>

# The Strategic Architecture of Niche Consumption Tracking: Product-Market Fit and Monetization in the Motorsport Vertical

## 1\. Introduction: The Unbundling of Social Identity and the Rise of Vertical Tracking

The contemporary digital landscape is witnessing a profound structural shift in how users interact with their hobbies. The era of the "town square"-characterized by broad, horizontal social networks like Facebook or X (formerly Twitter)-is increasingly giving way to "vertical" communities. These specialized platforms serve not merely as places of discussion, but as systems of record for specific consumption habits. This phenomenon, often described as the "Quantified Self" movement applied to media and entertainment, has birthed a new category of digital product: the "Vertical Tracker."

The success of platforms such as Letterboxd for film <sup>1</sup>, Goodreads for literature <sup>2</sup>, Backloggd for video games <sup>3</sup>, and Strava for physical activity <sup>4</sup> demonstrates a clear psychological driver: the modern enthusiast desires to curate, log, and analyze their consumption history. These platforms satisfy a triad of user needs: memory banking (archiving one's history), identity signaling (curating a public profile of taste), and social benchmarking (comparing consumption with peers).

This report presents a comprehensive analysis of the Product Market Fit (PMF) and monetization strategies for a hypothetical entrant into this sector, specifically targeting the **Motorsport and Racing Entertainment** vertical. This niche is currently characterized by a high-value, rapidly expanding demographic that is underserved by existing "utility-first" official applications. The analysis is predicated on a strict set of strategic constraints: monetization must be additive rather than subtractive, ensuring that the core utility of tracking remains accessible to all users while premium features enhance the experience through cosmetic customization, deep analytics, and ecosystem integration.

## 2\. Product Market Fit: The Motorsport Opportunity

### 2.1 The "Spreadsheet Refugee" and Unmet Demand

The strongest indicator of Product Market Fit in any domain is the existence of "hacky," manual solutions employed by users to bridge a gap in the market. In the absence of a dedicated "Letterboxd for Racing," the motorsport community has resorted to building complex, fragile infrastructure to track their fandom.

Analysis of community behavior reveals a significant population of "spreadsheet refugees." Users on platforms such as Reddit regularly share and maintain intricate Google Sheets to track Formula 1 seasons, log race results, calculate driver standings, and visualize championship battles.<sup>5</sup> These spreadsheets, while functional, suffer from critical limitations: they are difficult to maintain on mobile devices, lack social connectivity, and require manual data entry. The existence of a "Career Spreadsheet" culture in the F1 game community further highlights this desire for persistent, tracked history.<sup>7</sup>

Furthermore, the emergence of paid Notion templates designed specifically for F1 season tracking validates the hypothesis that users place financial value on the organization and aesthetic presentation of this data.<sup>9</sup> These templates, often selling for small sums, offer features like "Race Journaling" and "Driver Profiles," mirroring the exact feature set of a potential tracking application.<sup>11</sup> The user behavior is clear: the demand for a structured, beautiful record of racing consumption exists, but the current supply is fragmented across manual tools.

### 2.2 Demographic Shifts: The New Face of Motorsport

The viability of a social tracking product is heavily dependent on the demographic profile of the target audience. Historic stereotypes of motorsport fans as older, passive TV viewers are rapidly becoming obsolete. The modern motorsport fanbase, particularly within Formula 1, is undergoing a radical transformation that aligns perfectly with the "social tracker" product model.

The Youth Influx:

Data from the 2025 season indicates that the F1 fanbase is becoming significantly younger. Currently, 43% of the total fanbase is under the age of 35.12 This demographic is digitally native, accustomed to app-based life tracking, and heavily engaged with "gamified" loyalty mechanics. Unlike the aging demographic of NASCAR, where the median viewer age has historically hovered around 58 13, the F1 audience is now the youngest among major global sports leagues, with an average age of 32.13 This cohort is the primary user base for apps like Letterboxd and Strava, suggesting high receptivity to a similar tool for racing.

Gender Balance and Narrative Engagement:

The gender composition of the audience is also shifting, with female fans now accounting for 42% of the total fanbase and nearly half of all new fans.12 This shift is critical for product design. While traditional motorsport apps have focused on raw telemetry and engineering data (appealing to a historically male-dominated, technical segment), the new demographic is driven by narrative, personality, and community-trends accelerated by the "Drive to Survive" effect. These users are less likely to want a "lap time analyzer" and more likely to want a "race journal" where they can rate the excitement of a Grand Prix, review the drama of a strategy error, and list their favorite driver rivalries.

Global Expansion:

The rapid growth of the fanbase in the United States, where 73% of Gen Z respondents plan to attend a race 14, suggests a market with high disposable income. This is corroborated by the expansion of MotoGP, which saw a 12% global fanbase increase and record attendance in 2024, with over half of its fans also under 35.15

### 2.3 The Competitive Landscape: A "Blue Ocean" of Social Functionality

Current digital products in the motorsport sector fall into two distinct categories, neither of which addresses the "social tracking" need:

1\. The Official Broadcast Ecosystem:

Apps like the Official F1 App and MotoGP App are designed as broadcast companions. They excel at delivering live timing, news, and video content.17 However, they are fundamentally ephemeral; they focus on what is happening now, not what you have watched in the past. They lack the "diary" function that is central to the user's request.

2\. The Technical Telemetry Sector:

Platforms like F1Laps and TracingInsights cater to the hardcore analyst.18 They provide deep dives into tire degradation and lap telemetry. While valuable, these tools are often complex, lack social features, and are over-engineered for the casual "Drive to Survive" fan who wants to log and rate a race.

The Missing Link:

There is no dominant platform that allows a user to say, "I have watched 50 Grands Prix, my average rating for the 2024 season was 4.2 stars, and I have seen Lewis Hamilton win 15 times." This "Letterboxd for Racing" concept-where users can log, rate, review, and list races-is currently being approximated by users creating "Racing Movie" lists on Letterboxd itself.20 This cross-platform behavior is a screaming signal of Product Market Fit: users are trying to force film apps to work for racing content because a dedicated racing tracker does not exist.

## 3\. Product Strategy: The "Forever Free" Utility Model

To satisfy the core requirement that "monetization should not unlock basic features," the product strategy must adhere to a strict philosophy of **Commoditized Utility**. The act of logging, the history of consumption, and the ability to view one's own data must never be paywalled.

### 3.1 The "Pit Lane" Tier: Defining the Free Experience

Drawing lessons from the most successful vertical trackers, the following features constitute the baseline "Free Tier" (The "Pit Lane"):

- **Unlimited Logging:** Users must be able to log every race, qualifying session, and sprint shootout in history. Any cap on logging (e.g., "Log only the last 5 races") would destroy the utility of the app as a system of record. Trakt.tv's decision to limit personal lists for free users was met with friction <sup>22</sup>, a mistake this product must avoid.
- **The "Spoiler-Free" Architecture:** Unlike movies, where spoilers are annoying, in sports, spoilers render the content worthless. The app must feature a robust "Spoiler Shield" by default. As seen in sports UI design patterns, the interface should hide podium results and "Driver of the Day" awards until the user explicitly confirms they have watched the session.<sup>23</sup> This builds trust and allows the app to be used as a "catch-up" companion.
- **Social Interaction:** The ability to follow friends, like reviews, and comment on lists must be free to drive network effects. The value of the network grows with every new free user; restricting social features dampens this growth loop.<sup>1</sup>
- **Basic Statistics:** Users should have access to their "headline stats"-total races watched, hours consumed, and favorite teams. This provides immediate gratification and "shareability" without requiring a subscription.

### 3.2 The Strava Cautionary Tale: Avoiding Value Extraction

The fitness tracking giant Strava provides a critical case study in what _not_ to do. In 2020, Strava moved previously free features-specifically Segment Leaderboards and Route Planning-behind a paywall.<sup>24</sup> This shift from "value addition" to "value extraction" caused significant community unrest.

For the motorsport tracker, this means that once a feature is free, it must remain free forever. Monetization must be reserved exclusively for _new_, additive value propositions (synthesized insights, cosmetic customization) rather than the restriction of existing utility. The "Log" button is sacrosanct.

### 3.3 Technical Feasibility: The Data Infrastructure

Delivering a robust free tier requires a cost-effective data strategy. The motorsport data landscape is currently in flux, presenting both risk and opportunity.

- **The Ergast Transition:** For years, the Ergast Developer API was the backbone of free F1 apps. However, its deprecation at the end of 2024 poses a significant infrastructure challenge.<sup>25</sup> Reliance on a dying standard is a non-starter.
- **The Open Source Solution:** The community has rallied around **Jolpica-F1** and **OpenF1**.<sup>26</sup> These open-source projects aim to provide drop-in replacements for historical data and live timing. Utilizing these community-maintained sources is essential to keeping operating costs low, allowing the business to sustain a generous free tier without bleeding capital on expensive commercial licenses from providers like Sportradar or Stats Perform, which can cost thousands of dollars per month.<sup>28</sup>
- **Architecture for Scale:** To mitigate the risk of API outages or rate limits, the app should employ a "Fetch and Cache" architecture. Historical race results (which never change) should be ingested into the app's own database, minimizing real-time dependency on third-party services.

## 4\. Monetization Strategy: The "Experience & Ecosystem" Model

The user's directive is clear: avoid expensive subscriptions and ensure monetization enhances the experience. This points toward a diversified revenue model that relies less on "Gatekeeping Data" and more on "Monetizing Identity" and "Facilitating Commerce."

### 4.1 Tier 1: The "Supporter" Model (Monetizing Identity)

This layer monetizes the user's ego, self-expression, and desire to support the platform. It is strictly cosmetic and additive, ensuring no utility is lost for free users. This model mirrors the highly successful **Letterboxd Patron** and **Discord Nitro** strategies.

**Feature Set:**

- **Custom Event Posters:** Just as Letterboxd allows Patrons to swap the default movie poster for a custom, text-less, or artistic variant <sup>30</sup>, the motorsport tracker should allow users to swap the default "Grand Prix" thumbnail for vintage race posters, alternative artistic interpretations, or team-specific promotional art. This appeals to the "curator" persona.
- **Themed Interfaces (Team Colors):** Motorsport fans are tribal. A user paying \$3/month should be able to "skin" the app in Ferrari Red, McLaren Papaya, or Mercedes Silver. This creates a deeper emotional connection to the app.<sup>31</sup>
- **Profile Flair and Badges:** Implementation of a badge system (e.g., "Founder," "Supporter," "Pro Reviewer") allows users to signal status within the community. Discord's "Avatar Decorations" and "Profile Effects" have proven that users are willing to pay for digital flair that makes their presence stand out in comment sections.<sup>32</sup>
- **Custom App Icons:** A low-effort, high-value feature seen in apps like Serializd and Flighty, allowing users to match the app icon to their home screen aesthetic.<sup>34</sup>

Pricing Strategy:

To avoid the "expensive subscription" label, this tier should be priced at an "impulse" level-\$2.99/month or \$24.99/year. This price point is significantly lower than Trakt's VIP (\$60/year) 35, positioning it as a high-value, low-risk purchase.

### 4.2 Tier 2: The "Strategist" Model (Monetizing Deep Insights)

While basic logging is free, the _synthesis_ of that data into complex insights offers a premium value proposition for the "Quantified Self" power user. This aligns with the "added experience" requirement.

**Feature Set:**

- **Advanced Filtering:** While free users can filter by "Season," paid users could unlock complex queries: "Show me all wet races from 2012-2016 rated above 4 stars." This mirrors Trakt's advanced filtering, which is a key driver for their VIP subscription.<sup>36</sup>
- **Correlative Analytics:** "You rate races 15% lower when Max Verstappen wins." "Your viewing habits peak in July." These insights require server-side processing and analysis, justifying a cost.
- **The "All-Time" Dashboard:** Similar to Trakt and Letterboxd, the app can offer a persistent, interactive "Year in Review" or "All-Time Stats" page that visualizes the user's entire history on a heatmap.<sup>4</sup>

### 4.3 Tier 3: The Affiliate Ecosystem (The Hidden Revenue Engine)

This is the most critical differentiator for the motorsport vertical. Unlike film or book tracking, where the associated purchases are low-value (a \$15 movie ticket or \$20 book), motorsport fandom is linked to high-value capital expenditures. By integrating an affiliate ecosystem, the app can generate significant revenue from "Free" users, allowing the subscription price to remain low.

The "Contextual Commerce" Opportunity:

Instead of intrusive banner ads, the app should integrate high-value commercial links directly into the user experience in a way that feels like a utility.

**Table 4.1: High-Value Affiliate Opportunities in Motorsport**

| **Vertical** | **Partner Examples** | **Commission Rate** | **Integration Strategy** |
| --- | --- | --- | --- |
| **Sim Racing Hardware** | Fanatec, SimLab | **5% - 12%** <sup>38</sup> | Create a "My Rig" section on user profiles. Users list their wheel, pedals, and seat. These items are hyperlinked. A single \$1,000 rig conversion generates ~\$100 revenue (equivalent to 4 years of subscription). |
| **Race Tickets** | Motorsport Tickets | **2% - 8%** <sup>40</sup> | On the "Upcoming Races" calendar, add a "Get Tickets" button. This is a service to the user, facilitating access to live events. |
| **Memorabilia** | F1 Authentics | **3%** <sup>42</sup> | Contextual links on driver pages (e.g., "Shop Lewis Hamilton Memorabilia"). High average order value (AOV). |
| **Merchandise** | Red Bull Shop, F1 Store | **3% - 10%** <sup>43</sup> | "Get the Team Look" buttons on team profile pages. |

This strategy transforms the app from a passive tracker into an active portal for the motorsport lifestyle. The user gets utility (finding tickets/gear), and the platform gets revenue without gatekeeping features.

## 5\. Growth and Marketing: The "Zero-CAC" Approach

Acquiring users for a niche app through paid advertising (Facebook/Instagram Ads) is notoriously inefficient. The research suggests a "Product-Led Growth" (PLG) strategy that leverages the community's existing behavior.

### 5.1 The "Flighty" Effect: Viral Shareability

The flight tracking app _Flighty_ achieved massive growth not through ads, but by obsessing over the visual design of its shareable assets.<sup>45</sup> When a user tracks a flight, the app generates a beautiful, data-rich image (The "Passport") that users instinctively share on Instagram Stories.

Application to Motorsport:

The app should generate "Race Cards" after every Grand Prix. These cards would display the circuit layout, the user's star rating, their personal "Driver of the Day," and key stats. By empowering users to share these cards on social media, the app turns its user base into a viral marketing engine. This aligns with the "Identity Signaling" psychology-fans want to show their friends that they watched the race and what they thought of it.

### 5.2 Community Engagement: The Reddit Strategy

Navigating the strict self-promotion rules of communities like r/Formula1 and r/GrandPrixRacing requires a "value-first" approach.<sup>47</sup>

- **The "Data Story" Tactic:** Instead of posting "Download my app," the developer should post data visualizations generated _by_ the app. For example: "I analyzed the last 10 years of wet races using \[App Name\]-here is a graph showing which driver performs best in the rain." This provides immediate value to the subreddit and establishes the app as a credible tool for serious fans.<sup>48</sup>
- **The Spreadsheet Migration:** Actively monitoring threads where users ask for "2025 Season Trackers" or help with spreadsheets <sup>6</sup> allows for targeted, helpful intervention. Offering the app as an automated alternative to manual data entry directly addresses the "Spreadsheet Refugee" pain point.

### 5.3 Gamification and Retention

To keep users engaged during the off-season (a critical challenge in sports), the app should implement gamification mechanics that reward historical logging.

- **Badges and Achievements:** "The Historian" (Log 10 races from the 1990s), "The Night Owl" (Log a race watched live between 1 AM and 5 AM). These badges, similar to those on Backloggd <sup>31</sup>, encourage users to explore the database and backfill their history, increasing lock-in.
- **Off-Season Challenges:** During the winter break, the app can run "Rewatch" events, encouraging the community to watch and rate classic races together, keeping daily active users (DAU) high when no live racing is occurring.<sup>49</sup>

## 6\. Financial Viability and Pricing Structure

### 6.1 The Pricing Sensitivity Analysis

The recent backlash against **Trakt.tv**, which doubled its VIP price from \$30 to \$60/year, serves as a stark warning.<sup>35</sup> Users perceived this new price point as excessive for a "utility" tool. Conversely, Letterboxd's Pro tier sits comfortably around **\$19/year**, a price point that users describe as a "gift to myself".<sup>51</sup>

### 6.2 Proposed Pricing Tier "The Paddock Pass"

**Price:** \$2.49 / Month or \$19.99 / Year.

**Value Proposition:**

- **Ad-Free Experience:** Removal of any non-native ads.
- **Cosmetic Suite:** Unlimited changing of Race Posters and App Icons.
- **Deep Stats:** Access to the "All-Time" analytics dashboard.
- **Supporter Badge:** A profile badge indicating support for independent development.

Economic Model:

Assuming a conversion rate of 3-5% (standard for freemium utilities) and a user base of 10,000 active users:

- **Subscription Revenue:** ~400 subscribers @ \$20/yr = **\$8,000/yr**.
- **Affiliate Revenue:** This is the multiplier. If 1% of the 10,000 users buy a \$500 Sim Rig or F1 Ticket package via the app (100 users), at an average 5% commission (\$25), that generates **\$2,500**. However, high-intent users often convert at higher rates. A single "Whale" purchasing a \$2,000 Fanatec setup generates \$100+ instantly.

This diversified model ensures that the business is not solely dependent on subscriptions, allowing the price to remain "inexpensive" as requested.

## 7\. Conclusion

The opportunity to build the "Letterboxd of Motorsport" represents a significant gap in the current digital media landscape. The demographics are young, data-literate, and hungry for social connection-features that official apps and technical telemetry tools fail to provide.

By strictly adhering to a "Utility First" philosophy-where logging and history are free-and monetizing through "Identity" (cosmetics) and "Contextual Commerce" (affiliates), a new entrant can build a sustainable, profitable business that enhances the fan experience without exploiting it. The shift from the deprecated Ergast API to the community-led Jolpica project offers the perfect technical window to launch, capturing the "Spreadsheet Refugees" who are waiting for a home for their fandom. The strategy proposed herein creates a product that is not just a tool, but a companion to the racing lifestyle.

#### Works cited

- Letterboxd - Wikipedia, accessed January 1, 2026, <https://en.wikipedia.org/wiki/Letterboxd>
- Hardcover.app - Apps on Google Play, accessed January 1, 2026, <https://play.google.com/store/apps/details?id=hardcover.app&hl=en_US>
- Patreon Launch! - Backloggd, accessed January 1, 2026, <https://backloggd.medium.com/patreon-launch-20b6c8f3773>
- Strava Subscription Features, accessed January 1, 2026, <https://support.strava.com/hc/en-us/articles/216917657-Strava-Subscription-Features>
- I created a spreadsheet that helps you visualize the Driver's Championship - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/formula1/comments/1p3798y/i_created_a_spreadsheet_that_helps_you_visualize/>
- Formula 1 Spreadsheet Help : r/googlesheets - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/googlesheets/comments/1bslufu/formula_1_spreadsheet_help/>
- The Ultimate Career Spreadsheet is Back! Updated and Ready for F1 25! - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/F1Game/comments/1kq8h3t/the_ultimate_career_spreadsheet_is_back_updated/>
- The Ultimate Career Spreadsheet is Here! Updated and Ready for your F1 24 Career! : r/F1Game - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/F1Game/comments/1d2mb4u/the_ultimate_career_spreadsheet_is_here_updated/>
- 2025 Formula One Tracker Template | Notion Marketplace, accessed January 1, 2026, <https://www.notion.com/templates/2025-formula-one-tracker>
- F1 2025 Season Notion Calendar & Tracker (customizable Template) - Etsy, accessed January 1, 2026, <https://www.etsy.com/listing/1875212524/f1-2025-season-notion-calendar-tracker>
- F1 Tracker/Journal Template by Notedly | Notion Marketplace, accessed January 1, 2026, <https://www.notion.com/templates/f1-tracker-journal>
- Formula 1's record-breaking 2025 season in numbers, accessed January 1, 2026, <https://www.formula1.com/en/latest/article/formula-1s-record-breaking-2025-season-in-numbers.irq7aR8PcyAw7ysO72vJn>
- NASCAR, IndyCar, and F1: Comparing Fan Base Ages and NASCAR's real problem, accessed January 1, 2026, <https://www.autoracing1.com/pl/463147/nascar-indycar-and-f1-comparing-fan-base-ages-and-nascars-real-problem/>
- Formula 1 and Motorsport Network unveil 2025 Global Fan Survey, accessed January 1, 2026, <https://www.formula1.com/en/latest/article/formula-1-and-motorsport-network-unveil-2025-global-fan-survey.4YqMebNy8BLaapyJfjzDXO>
- MotoGP sees global fanbase increase to 632m in 2025 - BlackBook Motorsport, accessed January 1, 2026, <https://www.blackbookmotorsport.com/news/motogp-season-review-numbers-attendance-viewership-december-2025/>
- MotoGP™ closes 2025 with record-breaking growth, accessed January 1, 2026, <https://www.motogp.com/en/news/2025/12/18/motogp-closes-2025-with-record-breaking-growth/823791>
- Follow the season like never before with the Official F1 ® App, accessed January 1, 2026, <https://www.formula1.com/en/latest/article/follow-the-season-like-never-before-with-the-official-f1-app.2ZQq88HmPhfx3Ch13JAelm>
- TracingInsights.com - F1 Racing Analytics - Lap Times, Telemetry Data & Race Insights, accessed January 1, 2026, <https://tracinginsights.com/>
- F1Laps: manage your F1 25 game, setups and AI difficulty, accessed January 1, 2026, <https://www.f1laps.com/>
- Bored in the off-season? Check out my Letterboxd list of over 850 Racing & Motorsport films and documentaries. : r/formula1 - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/formula1/comments/zy4pqb/bored_in_the_offseason_check_out_my_letterboxd/>
- With F1 in wide release next week, what are other racing / car-based films that should be revered? : r/Letterboxd - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/Letterboxd/comments/1ledbv7/with_f1_in_wide_release_next_week_what_are_other/>
- Freemium Experience: More Features for All with Usage Limits - Trakt Forums, accessed January 1, 2026, <https://forums.trakt.tv/t/freemium-experience-more-features-for-all-with-usage-limits/41641>
- Sports App UI Design Template - Uizard, accessed January 1, 2026, <https://uizard.io/templates/mobile-app-templates/sports-app/>
- Strava Premium: is it worth it? - Canadian Running Magazine, accessed January 1, 2026, <https://runningmagazine.ca/sections/training/strava-premium-is-it-worth-it/>
- Ergast API is being deprecated at the end of 2024 · theOehrly Fast-F1 · Discussion #445, accessed January 1, 2026, <https://github.com/theOehrly/Fast-F1/discussions/445>
- OpenF1 API - Real-time and historical Formula 1 data - GitHub, accessed January 1, 2026, <https://github.com/br-g/openf1>
- Changelog • f1dataR - GitHub Pages, accessed January 1, 2026, <https://scasanova.github.io/f1dataR/news/index.html>
- F1 API Data Feeds Packages - Goalserve, accessed January 1, 2026, <https://www.goalserve.com/frog/sport-data-feeds/f1-api/prices>
- Stats Perform API Pricing, Review and Data - SportsAPI.com, accessed January 1, 2026, <https://sportsapi.com/api-directory/statsperform/>
- ultimately whats the difference between pro and patron and which would u recommend ? : r/Letterboxd - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/Letterboxd/comments/1aeo1tc/ultimately_whats_the_difference_between_pro_and/>
- What are all the possible badges I can earn on Backloggd? - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/backloggd/comments/18y1m2q/what_are_all_the_possible_badges_i_can_earn_on/>
- Profile Effects - Discord Support, accessed January 1, 2026, <https://support.discord.com/hc/en-us/articles/17828465914263-Profile-Effects>
- Avatar Decorations & Profile Effects: Collect and Keep the Newest Styles - Discord, accessed January 1, 2026, <https://discord.com/blog/avatar-decorations-collect-and-keep-the-newest-styles>
- Serializd - App Store - Apple, accessed January 1, 2026, <https://apps.apple.com/pk/app/serializd/id1581244120>
- VIP membership pricing - General - Trakt Forums, accessed January 1, 2026, <https://forums.trakt.tv/t/vip-membership-pricing/56942>
- Trakt VIP in 2024/25 - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/trakt/comments/1hl82gl/trakt_vip_in_202425/>
- All Time Stats - VIP Features - Trakt Forums, accessed January 1, 2026, <https://forums.trakt.tv/t/all-time-stats/19086>
- Fanatec Affiliate Program, accessed January 1, 2026, <https://www.postaffiliatepro.com/affiliate-program-directory/fanatec-affiliate-program/>
- Sim-Lab Affiliate Program, accessed January 1, 2026, <https://sim-lab.eu/en-us/pages/affiliate>
- Affiliates - Sportsevents365, accessed January 1, 2026, <https://tickets.sportsevents365.com/services/affiliates/>
- Motorsport Tickets Affiliate Programme - Awin, accessed January 1, 2026, <https://ui.awin.com/merchant-profile/21865>
- Affiliates - F1 Authentics, accessed January 1, 2026, <https://us.f1authentics.com/pages/affiliates>
- Affiliate Program - F1 Store, accessed January 1, 2026, <https://f1store.formula1.com/en/affiliates/x-3066>
- Oracle Red Bull Racing Affiliate Program, accessed January 1, 2026, <https://www.postaffiliatepro.com/affiliate-program-directory/oracle-red-bull-racing-affiliate-program/>
- How Flighty Grew by Obsessing Over Product, Not Ad Campaigns - Ryan Jones - YouTube, accessed January 1, 2026, <https://www.youtube.com/watch?v=ulKpAAv5GJ4>
- How Flighty grows by obsessing over product, not ad campaigns - RevenueCat, accessed January 1, 2026, <https://www.revenuecat.com/blog/growth/ryan-jones-flighty-launched-podcast-2025/>
- Rules: r/formula1 Community Guidelines - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/formula1/wiki/userguide/>
- 7 weeks until iOS app launch - how to build audience on Reddit or another social without looking like spam? : r/SaaS, accessed January 1, 2026, <https://www.reddit.com/r/SaaS/comments/1py5263/7_weeks_until_ios_app_launch_how_to_build/>
- 10 Proven Strategies to Boost Membership Retention at Your Sports Facility - Swift, accessed January 1, 2026, <https://www.runswiftapp.com/blog/10-proven-strategies-to-boost-membership-retention-at-your-sports-facility>
- 10 Strategies to Increase Fan Engagement in Sports | JWU Online, accessed January 1, 2026, <https://online.jwu.edu/blog/strategies-to-increase-fan-engagement-in-sports/>
- Is it worth the paid subscription to get the extra features? : r/Letterboxd - Reddit, accessed January 1, 2026, <https://www.reddit.com/r/Letterboxd/comments/1gx19p3/is_it_worth_the_paid_subscription_to_get_the/>

# Functional Design Specification: Parc Fermé

**Version 1.0 | Product: Social Cataloging for Motorsport**

This document outlines the functional user experience (UX), interface design patterns, and core workflows for "Parc Fermé." It translates the strategic vision into concrete screens and interactions, focusing on a "Spoiler-Free" architecture and a clear distinction between the **Standard (Free)** utility and the **Paddock Pass (Premium)** experience.

## 1\. Design Philosophy & Interface Principles

- **The "Spoiler Shield" Protocol:** By default, the app assumes the user has _not_ seen the race. All interfaces must obscure results (podiums, winners, fastest laps) until the user explicitly "logs" the race or toggles a "Reveal" switch.
- **Card-Based UI:** Information is presented in "cards" (Race Cards, Review Cards, Driver Cards) to allow for easy stacking and mobile responsiveness.
- **Dark Mode Native:** Given that racing consumption often happens in low-light environments (early mornings/late nights), the default UI is dark-themed with high-contrast accent colors (Signal Green, Safety Car Yellow) for readability.
- **Haptic "Mechanical" Feel:** Interactions (taps, toggles) should use haptic feedback to mimic the tactile feel of switches on a steering wheel.

## 2\. Core User Flows (The "Free" Utility)

These flows are accessible to every user and form the "memory bank" functionality of the app.

### 2.1 The "Superlicence" Onboarding

**Goal:** Establish user identity and spoiler preferences without friction.

- **Screen: "Welcome to the Paddock"**
  - _Action:_ Sign up via Email, Apple, or Google.
  - _Customization:_ User selects their "Primary Series" (F1, IndyCar, MotoGP, WEC). This dictates the default calendar view.
  - _Critical Setting:_ **Spoiler Tolerance Slider.**
    - _Option A (Strict):_ Hide EVERYTHING (Winners, Podiums, Thumbnails).
    - _Option B (Moderate):_ Show thumbnails, hide text results.
    - _Option C (Live):_ Show everything immediately (for users who watch live).
- **Screen: "Select Your Team"**
  - _Interaction:_ A grid of team logos. Selecting one sets the user's default accent color (e.g., Papaya Orange for McLaren fans) for _their_ profile view.

### 2.2 The "Race Weekend" Log Flow

**Goal:** The primary action-logging a memory. This flow handles the complexity of "Watched" vs. "Attended."

- **Trigger:** User taps the floating "+" button or selects a race from the Calendar.
- **Screen 1: Context Selector**
  - _Visual:_ A split card showing the race title (e.g., "2024 British Grand Prix").
  - _Decision:_ Two large buttons: **"I Watched It"** (TV icon) vs. **"I Was There"** (Ticket icon).

#### Path A: "I Watched It" (Broadcast Experience)

- **Screen: The Rating Matrix**
  - _Date:_ Defaults to today (can be backdated).
  - _Star Rating:_ 0.5 to 5.0 stars (Slide to set).
  - _The "Excitement" Meter:_ A distinct 0-10 slider. This data is aggregated globally to tell other users if a race is boring (2/10) or a thriller (10/10) without revealing the winner.
  - _Tags (Pills):_ Tap to select: Rain, Red Flag, Strategy Masterclass, Controversial, Boring.
- **Screen: The Review (Journal)**
  - _Text Field:_ "Write your race report..." (Supports Markdown).
  - _Spoiler Toggle:_ "Contains Spoilers?" (Auto-checked if the race happened <7 days ago).
  - _Action:_ Tap "Log Race".
  - _Event:_ Confetti animation (using checkered flag particles).

#### Path B: "I Was There" (Venue Experience)

- **Screen: Venue Logistics**
  - _Seat Selector:_ Dropdown list of Grandstands + "General Admission."
  - _Venue Rating:_ 1-5 Stars (distinct from the _racing_ action).
  - _Criteria Sliders:_
    - View of Track (1-5)
    - Access/Parking (1-5)
    - Facilities/Food (1-5)
- **Screen: The Memory**
  - _Photo Upload:_ "Add View from Seat." (Critical for building the venue guide database).
  - _Text Field:_ Prompt changes to: "How was the atmosphere? Any tips for future attendees?"

### 2.3 The "Home Feed" (Spoiler-Free)

**Goal:** Social discovery without ruining the race result.

- **Logic:** The feed shows friends' activities.
- **State: Unwatched Race**
  - If the user _has not_ logged the "2024 Monaco GP" yet:
  - _Friend's Post:_ "User X reviewed Monaco GP."
  - _Content:_ The review text is blurred. The Star Rating is visible (unless "Strict" mode is on). The "Winner" image is replaced by a generic circuit map.
- **State: Watched Race**
  - If the user _has_ logged it:
  - _Content:_ Full review text visible. Winner photo visible.
- **Interactions:**
  - _Tap:_ Opens the review.
  - _Long Press:_ "Quick Log" (Add to my diary).

## 3\. Monetized Features (The "Paddock Pass")

These features are strictly additive. They enhance the _presentation_ and _depth_ of the data but do not block logging.

### 3.1 Cosmetic Customization (Identity)

**Goal:** Allow users to curate their digital "fandom."

- **Feature: Custom Race Posters**
  - _Standard User:_ Sees the default "Broadcast Graphic" or Circuit Map for a race.
  - _Pro User Flow:_
    - Go to a logged race (e.g., 2021 Abu Dhabi).
    - Tap "Change Poster."
    - _Selection Grid:_ Choose from "Official FIA Poster," "Team Promo Poster," or "Fan Art" (sourced from community artists).
    - _Result:_ This custom poster now appears in their Diary and lists, making their profile look unique.
- **Feature: App Icon Factory**
  - _Settings Screen:_ "Paddock Pass" section.
  - _Selection:_ Change the home screen app icon to match favorite tire compounds (Soft Red, Medium Yellow, Hard White, Wet Blue) or retro helmet designs.

### 3.2 Deep Analytics (The "Telemetry" Dashboard)

**Goal:** Satisfy the "Quantified Self" urge of racing nerds.

- **Standard User:** Sees "Total Races Watched" and "Favorite Driver."
- **Pro User Screen: "Season Analysis"**
  - _Heatmap:_ A GitHub-style contribution graph showing which days of the year they watched racing.
  - _Driver Bias Graph:_ A radar chart showing "Average Rating given when wins." (e.g., "You rate races 15% lower when Max Verstappen wins").
  - _Series Split:_ Pie chart breaking down consumption (60% F1, 20% IndyCar, 20% MotoGP).

## 4\. The Ecosystem Integrations (Affiliate Revenue)

This layer is embedded into the utility screens ("Circuit Guide" and "Race Details") to drive revenue without intrusive banner ads.

### 4.1 The "Circuit Guide" (Venue Data)

**Screen:** User views "Silverstone Circuit."

- **Tab 1: Reviews:** Aggregate "Attended" ratings (View, Access, Facilities).
- **Tab 2: Seat Map:** An interactive SVG map of the track.
  - _Interaction:_ Tapping a grandstand shows "View from Seat" photos uploaded by users.
- **Tab 3: Tickets (Monetized):**
  - _UI Element:_ A "Get Tickets" button floating at the bottom.
  - _Action:_ Opens an in-app browser or deep link to _Motorsport Tickets_ (Affiliate Partner) pre-filtered for that specific circuit.

### 4.2 The "Merch Stand" (Contextual Commerce)

**Screen:** User views a "Driver Profile" (e.g., Lewis Hamilton).

- **Section: "Driver Kit"**
  - _Content:_ A carousel of gear (Caps, Team Shirts, Model Cars).
  - _Source:_ Data pulled from _F1 Store_ or _Fanatics_ product feeds.
  - _Action:_ "Shop Look" button links directly to the affiliate product page.

## 5\. Technical Data & Event Handling

### 5.1 The "Weekend Container" Logic

Unlike movies, a "Race" is actually a collection of sessions.

- **Object Structure:** Event (Grand Prix) -> contains -> \`\`.
- **Logging Logic:**
  - Users usually rate the _Race_.
  - However, the UI must allow tapping a "More Sessions" dropdown to log/rate _Qualifying_ separately if they wish.
  - _Aggregate:_ The "Event Rating" is the weighted average of the logged sessions (mostly the Race).

### 5.2 Spoiler Logic (The "Embargo" System)

- **Event:** API fetches results for "Australian GP" at 07:00 GMT.
- **System Action:** Database flags this race as status: completed.
- **UI Response:**
  - The app does _not_ send a push notification saying "Sainz Wins!"
  - The app sends a push notification: "The Australian GP has finished. Rate it now!"
  - The "Race Card" on the home screen updates to "Rateable" status but keeps the result hidden behind the "Spoiler Shield."

## 6\. Visual Wireframe Descriptions

### Screen: The Diary (Profile Tab)

- **Header:** User Avatar (with Pro Badge if applicable), Bio, "Followers/Following."
- **Stats Row:** "142 Races" | "32 Tracks" | "4.2 Avg Rating".
- **The Grid (Main View):**
  - A scrolling grid of movie-poster-style images representing logged races.
  - _Visual Detail:_ Each poster has a small colored dot in the corner indicating the user's rating (Green = High, Red = Low).
  - _Attended Indicator:_ A small "Ticket Stub" overlay icon on races the user attended live.

### Screen: The Lists (Discovery)

- **Standard View:** Vertical list of races.
- **Pro Feature:** "Ranked Mode."
  - Allows the user to drag-and-drop races to reorder them (e.g., "My Top 10 Races of All Time").
  - Displays a number (#1, #2, #3) next to the poster.

## 7\. Summary of Value Exchange

| **Feature** | **Free User** | **Pro User ("Paddock Pass")** |
| --- | --- | --- |
| **Logging** | Unlimited (All Series) | Unlimited |
| **History** | Full Diary Access | Full Diary Access |
| **Stats** | Basic (Total counts) | Deep (Heatmaps, Driver Bias) |
| **Posters** | Default Only | Custom (Vintage, Art) |
| **Filtering** | By Year/Series | By Driver, Team, Weather, Rating |
| **Ads** | Native Affiliate Links | No "Banner" Ads (Affiliates remain) |

This design ensures the "Side Project" remains sustainable (low maintenance, affiliate revenue) while providing a "deluxe" feel for super-fans willing to pay for identity and data.