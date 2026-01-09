# The Third Turn Integration 

This document describes the data source integration for The Third Turn
within the Parc Ferme project. The Third Turn is a comprehensive database
for historic motorsport data of most racing series.

This document contains technical details about how data is ingested from
The Third Turn, the structure of the data, and any relevant considerations
for working with this data source.

> We scrape the data from The Third Turn website, as there is no public API
> available. Please ensure compliance with The Third Turn's terms of service
> when using this data. They use the Attribution-NonCommercial-ShareAlike 4.0 International
> (CC BY-NC-SA 4.0) license for their content. So we must provide proper attribution
> and cannot use the data for commercial purposes (which i do not intend to do, so we're good).

This document serves as an entry point for creating a data ingestion pipeline
for The Third Turn within the Parc Ferme project.

This document contain code examples in JavaScript for scraping data from
The Third Turn website while we build the ingestion pipeline in Python.
This is to facilitate understanding of the data structure and how to
extract the necessary information and since JavaScript can be run directly
in the browser console it is easier to experiment with.

Note how we do not use the driver and track database index pages to get lists of drivers and tracks, instead we get them from the series and season pages as we encounter them.
This is to ensure we only get drivers and tracks that are actually used in series and seasons we have data for and support.

## URL Structure

The Third Turn organizes its data in a hierarchical URL structure. The
base URL is:

```
https://www.thethirdturn.com/wiki/
```

From there, different types of data can be accessed via specific URL
patterns:

> The "Data Points" sections below indicate which Parc Ferme data models and contains direct column mappings, see [EventModel.cs](/src/api/Models/EventModels.cs) for more details. 
> Note the distinction between how _Entities_ and _ValueObjects_ are represented in this document. _Entities_ are top-level models with their own identity and relations are inferred via foreign keys and how the scraped data is organized, 
> while _ValueObjects_ are nested models that exist within an Entity and are described as child collections of their parent Entity like SeriesAlias[] under Series.
> It could be that some data points from other _Entities are mentioned in the context of a different Entity for clarity on how to obtain them, like how the `Individual Series Page` declares a `Season.Year` data point
> Unless otherwise specified the variable `data` always refers to the main _Entity_ defined in that section. Any other variables are using the naming conventiosn of the Parc Ferme EventModel.cs file. in most cases the table name pluralized will serve as the variable name.
> Data Points should not be considered "Complete" if that section is about them, they are just the data points we currently extract from that page.

- **Series Database Index**: 
    - URL: `https://thethirdturn.com/wiki/Series_Database:Index`
    - Source FIle: `docs/thethirdturn/THETHIRDTURN/series_database_index.html`
    - Description: Lists all racing series available in the database.
    - Data Points: 
        - Series
            - Name: From data {seriesLinks[].name} in the series list.
            - Slug : Slugify from Name
    - Javscript to get all series names, URLs, and GoverningBody as json:
    ```javascript
    // On: https://thethirdturn.com/wiki/Series_Database:Index
    // Goal: extract [{ name, href }, ...] robustly (avoid brittle childNodes indexing)

    // Each non-header row in the main series table
    const seriesRows = document.querySelectorAll(
        "#mw-content-text table tbody tr:not(:first-child)"
    );

    const seriesLinks = [];

    for (const row of seriesRows) {

        // Governing body is in the header-ish cell of the row
        const governingBody =
            row.querySelector("th")?.textContent?.trim() ?? null;

        // Series link is typically in the data cell (often td > p > a)
        const a = row.querySelector("td a[href*='/wiki/']");
        const name = a?.textContent?.trim() ?? null;
        const href = a?.href ?? null;

        // Skip rows that don't look like series entries
        if (!governingBody || !name || !href) continue;

        // Stop once we hit the local racing section (per original intent)
        if (governingBody === "Local Racing Division") break;

        seriesLinks.push({ name, href });
    }

    console.log(seriesLinks);
    // Optional: copy to clipboard in the browser console
    // copy(seriesLinks);
    ```

    this will give you an array of objects with `name` and `href` properties for each series link.

    Which you can then fetch each series page to get more detailed data.

- **Individual Series Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Series_Name}`
    - Source File: `docs/thethirdturn/THETHIRDTURN/series_nascar_cup_series_central.html`
    - Description: Contains detailed information about a specific racing series,
      including links to seasons and drivers.
    - Data Points: 
        - Series        
            - SeriesAlias[]
                - AliasName : See the `getAlternativeNames` function below for extracting alternative names from series pages.
                - AliasSlug : Slugify from AliasName
                - ValidFrom : Also, see `getAlternativeNames` for date extraction.
                - ValidTo : Also, see `getAlternativeNames` for date extraction.
                - Source : "The Third Turn"
        - Season[]
            - Year : From data {seasons[].year} in the seasons list.
    - Example: `https://thethirdturn.com/wiki/NASCAR_Cup_Series_Central`
    - Useful Links:
        - Drivers List: `https://thethirdturn.com/wiki/{Series_Name}/Drivers`
    - Useful Javascript to get all Seasons as json:
    ```javascript
    // 1. Select all matching links using the generalized selector
    // Note: I removed specific indices from div, tr, and td to get everything.
    const seasons = document.querySelectorAll("#mw-content-text > div > div > table > tbody > tr > td > a");

    // 2. Map the results to a structured object
    const data = Array.from(seasons).map(link => {
    return {
        year: link.textContent.trim(),
        href: link.href
    };
    });
    ```
    This will give you an array of objects with `year` and `href` properties for each season link.

    The only data we need to create a season is the year, which is in the text property of each link.
    The href property can be used to fetch the season page for more detailed data if needed.

    `getAlternativeNames` function referenced above, they are found like this for example:

    `NASCAR Strictly Stock (1949); NASCAR Grand National (1950-1970); NASCAR Winston Cup Series (1971-2003); NASCAR Nextel Cup Series (2004-2007); NASCAR Sprint Cup Series (2008-2016); Monster Energy NASCAR Cup Series (2017-2019); NASCAR Cup Series (2020-present)`

    ```javascript
    function getAlternativeNames() {
        const altNames = document.querySelector("#mw-content-text > div > div:nth-child(4) > table > tbody > tr:nth-child(2) > td").textContent.replace("Alternatively Known As: ", "").trim().split(";").map(name => name.trim());
        const altNameObjects = altNames.map(nameEntry => {
            const match = nameEntry.match(/^(.*?)(?:\s*\((\d{4})(?:-(\d{4}|present))?\))?$/);
            if (match) {
                return {
                    AliasName: match[1].trim(),
                    ValidFrom: match[2] ? parseInt(match[2], 10) : null,
                    ValidTo: match[3] ? (match[3] === "present" ? null : parseInt(match[3], 10)) : null
                };
            }
            return null;
        }).filter(entry => entry !== null);

        // Fix the ValidTo of the furst entry to be one year before the ValidFrom of the second entry
        for (let i = 0; i < altNameObjects.length - 1; i++) {
            if (altNameObjects[i + 1].ValidFrom && !altNameObjects[i].ValidTo) {
                altNameObjects[i].ValidTo = altNameObjects[i + 1].ValidFrom - 1;
            }
        }

        // fix the last entry ValidTo to be the 

        return altNameObjects;
    }
    ```

- **Individual Season Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Season_Name}`
    - Source File: `docs/thethirdturn/season_1949_nascar_strictly_stock_central.html`
    - Description: Contains detailed information about a specific season, containing data and links to individual races
      about races, drivers, and results.
    - Data Points:
        - Round
            - Name : "{Season.Series.Year} {Season.Series.Name} Round {raceListings[].round_number}" # This is going to be objectively wrong for some series but it's the best we can do with the data available.
            - RoundNumber : {raceListings[].round_number}
            - DateStart : {raceListings[].date}
            - CircuitSlug : Slugify from {raceListings[].track}
        - Circuit (from track links)
            - Name : {raceListings[].trackName}
            - Slug : Slugify from Name
    - Example: `https://thethirdturn.com/wiki/1949_NASCAR_Strictly_Stock_Central`
    - Useful Javascript to get all Races as json:
    ```javascript
    // On: https://thethirdturn.com/wiki/1949_NASCAR_Strictly_Stock_Central
    // Goal: Extract race listings from the season page
    
    // Select the race listings table (first table with class "pointtable sortable resultdiv")
    const raceTable = document.querySelector("#mw-content-text table.pointtable.sortable.resultdiv");
    
    // Get all data rows (skip header rows)
    const raceRows = raceTable?.querySelectorAll("tbody tr:not(:first-child):not(:nth-child(2))") ?? [];
    
    const raceListings = [];
    
    for (const row of raceRows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 4) continue;
        
        // Race number is in first cell, inside a link
        const raceLink = cells[0]?.querySelector("a");
        const roundNumber = parseInt(raceLink?.textContent?.trim() ?? "0", 10);
        const raceHref = raceLink?.href ?? null;
        
        // Date is in second cell
        const dateText = cells[1]?.textContent?.trim() ?? null;
        
        // Track is in third cell, may have a link
        const trackLink = cells[2]?.querySelector("a");
        const trackName = trackLink?.textContent?.trim() ?? cells[2]?.textContent?.trim() ?? null;
        const trackHref = trackLink?.href ?? null;
        
        // Winner is in fourth cell
        const winnerLink = cells[3]?.querySelector("a");
        const winnerName = winnerLink?.textContent?.trim() ?? cells[3]?.textContent?.trim() ?? null;
        const winnerHref = winnerLink?.href ?? null;
        
        if (!roundNumber || !dateText) continue;
        
        raceListings.push({
            roundNumber,
            raceHref,
            date: dateText,
            trackName,
            trackHref,
            winnerName,
            winnerHref
        });
    }
    
    console.log(raceListings);
    // Returns: [{ roundNumber: 1, raceHref: "...", date: "19 June 1949", trackName: "Charlotte, NC", ... }, ...]
    ```


- **Individual Race Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Race_Name}`
    - Source File: `docs/thethirdturn/nascar_strictly_stock_1949_01.html`
    - Description: Contains detailed information about a specific race event,
      including session results, classification, and race-specific details.
    - Data Points:
        - Round (from header)
            - Name : Page title, e.g., "NASCAR Strictly Stock:1949-01"
            - CircuitSlug : Slugify from track link in header
            - DateStart : From "Held on {date}" text
        - Session
            - Type : Race (always Race for TTT data)
        - Result[] (from FEATURE RESULTS table)
            - Position : {results[].fin} - Finish position
            - GridPosition : {results[].st} - Starting position  
            - CarNumber : {results[].carNumber} - String, the # column
            - Points : {results[].pts} - Points earned
            - Laps : {results[].laps} - Laps completed
            - LapsLed : {results[].led} - Laps led
            - StatusDetail : {results[].status} - "running", "dnf", "overheating", etc.
        - Driver (from result rows)
            - Name : {results[].driverName}
            - Slug : Slugify from name or extract from href
        - Team (from Sponsor column, may be empty)
            - Name : {results[].sponsor}
    - Example: https://thethirdturn.com/wiki/NASCAR_Strictly_Stock:1949-01
    - Useful Javascript:
    ```javascript
    // On: https://thethirdturn.com/wiki/NASCAR_Strictly_Stock:1949-01
    // Goal: Extract race metadata and full results table
    
    // --- RACE METADATA ---
    // Get race title
    const raceTitle = document.querySelector("#mw-content-text table td[style*='font-size:200%'] b")?.textContent?.trim();
    
    // Get date and track from "Held on ... at ..." line
    const heldOnText = document.querySelector("#mw-content-text table td[style*='font-size:125%'] b i")?.textContent?.trim();
    // Parse: "Held on  June 19, 1949 at Charlotte Speedway in Charlotte, NC"
    const heldOnMatch = heldOnText?.match(/Held on\s+(.+?)\s+at\s+(.+?)\s+in\s+(.+)/i);
    const raceDate = heldOnMatch?.[1]?.trim() ?? null;
    const trackName = heldOnMatch?.[2]?.trim() ?? null;
    const trackLocation = heldOnMatch?.[3]?.trim() ?? null;
    
    // Get distance info (e.g., "200 L, 150 M, 241.4 KM - Scheduled Distance")
    const distanceText = document.querySelectorAll("#mw-content-text table td[style*='font-size:125%']")[1]?.textContent?.trim();
    
    const raceMetadata = {
        title: raceTitle,
        date: raceDate,
        trackName,
        trackLocation,
        distance: distanceText
    };
    
    // --- RESULTS TABLE ---
    // Find the results table (table with class "racetable sortable" inside div.resultdiv)
    const resultsTable = document.querySelector("div.resultdiv table.racetable.sortable");
    const resultRows = resultsTable?.querySelectorAll("tbody tr:not(:first-child)") ?? [];
    
    const results = [];
    
    for (const row of resultRows) {
        // Finish position is in th
        const finishPos = row.querySelector("th")?.textContent?.trim();
        if (!finishPos) continue;
        
        const cells = row.querySelectorAll("td");
        if (cells.length < 9) continue;
        
        // Columns: St, #, Driver, Sponsor, Make, Laps, Led, Status, Pts
        const startPos = cells[0]?.textContent?.trim() || null;
        const carNumber = cells[1]?.textContent?.trim() || null;
        
        const driverLink = cells[2]?.querySelector("a");
        const driverName = driverLink?.textContent?.trim() ?? cells[2]?.textContent?.trim();
        const driverHref = driverLink?.href ?? null;
        
        const sponsorLink = cells[3]?.querySelector("a");
        const sponsor = sponsorLink?.textContent?.trim() ?? cells[3]?.textContent?.trim() || null;
        
        const make = cells[4]?.textContent?.trim() || null;
        const laps = cells[5]?.textContent?.trim() || null;
        const lapsLed = cells[6]?.textContent?.trim() || null;
        const status = cells[7]?.textContent?.trim() || null;
        const points = cells[8]?.textContent?.trim() || null;
        
        results.push({
            position: parseInt(finishPos, 10),
            gridPosition: startPos ? parseInt(startPos, 10) : null,
            carNumber,
            driverName,
            driverHref,
            sponsor,
            make,
            laps: laps ? parseInt(laps, 10) : null,
            lapsLed: lapsLed ? parseInt(lapsLed, 10) : null,
            status,
            points: points ? parseFloat(points) : null
        });
    }
    
    console.log({ raceMetadata, results });
    // Returns: { raceMetadata: {...}, results: [{ position: 1, gridPosition: 12, carNumber: "34", driverName: "Jim Roper", ... }, ...] }
    ```

- **Driver Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Driver_Name}`
    - Source File: `docs/thethirdturn/fernando_alonso.html`
    - Description: Contains comprehensive information about a specific driver,
      including career statistics, race history, and biographical details.
    - Data Points:
        - Driver
            - FirstName : Parsed from full name
            - LastName : Parsed from full name  
            - Nickname : Text in quotes after name, e.g., "Teflonso"
            - DateOfBirth : Parsed from "(July 29, 1981 - )" format
            - PlaceOfBirth : Text after date, e.g., "Oviedo, Spain"
            - Nationality : Derived from PlaceOfBirth country
        - DriverAlias[]
            - AliasName : If multiple name variations exist in results
            - Source : "The Third Turn"
    - Example: https://thethirdturn.com/wiki/Fernando_Alonso
    - Useful Javascript:
    ```javascript
    // On: https://thethirdturn.com/wiki/Fernando_Alonso
    // Goal: Extract driver biographical info and career series list
    
    // --- DRIVER BIO ---
    // Find the header table with driver info
    const headerTable = document.querySelector("#mw-content-text table[width='100%'][style*='text-align:left']");
    const headerCell = headerTable?.querySelector("th");
    
    // Full name is in the first span with large font
    const fullName = headerCell?.querySelector("span[style*='font-size:250%'] b")?.textContent?.trim();
    
    // Nickname is in a span with 110% font containing quotes
    const nicknameSpan = Array.from(headerCell?.querySelectorAll("span[style*='font-size:110%']") ?? [])
        .find(span => span.textContent.includes('"'));
    const nickname = nicknameSpan?.textContent?.trim()?.replace(/^"|"$/g, '') ?? null;
    
    // Birth info is in format "(July 29, 1981 -     )"
    const birthSpan = Array.from(headerCell?.querySelectorAll("span[style*='font-size:110%']") ?? [])
        .find(span => span.textContent.match(/\([A-Z][a-z]+ \d+, \d{4}/));
    const birthText = birthSpan?.textContent?.trim();
    const birthMatch = birthText?.match(/\(([A-Z][a-z]+ \d+, \d{4})\s*-\s*([^)]*)\)/);
    const dateOfBirth = birthMatch?.[1] ?? null;
    const dateOfDeath = birthMatch?.[2]?.trim() || null; // Empty if still alive
    
    // Place of birth is in its own span after the birth date span
    // Look for span containing city, country pattern
    const placeSpan = Array.from(headerCell?.querySelectorAll("span[style*='font-size:110%']") ?? [])
        .find(span => !span.textContent.includes('"') && 
                      !span.textContent.includes('(') && 
                      span.textContent.includes(',') &&
                      !span.textContent.includes('Race'));
    const placeOfBirth = placeSpan?.textContent?.trim() ?? null;
    
    // Parse name into first/last
    const nameParts = fullName?.split(' ') ?? [];
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') ?? '';
    
    const driverInfo = {
        fullName,
        firstName,
        lastName,
        nickname,
        dateOfBirth,
        dateOfDeath,
        placeOfBirth,
        nationality: placeOfBirth?.split(',').pop()?.trim() ?? null
    };
    
    // --- CAREER SERIES LIST ---
    // Find all series sections (tables with series logos)
    const seriesTables = document.querySelectorAll("#mw-content-text table.wikitable");
    
    const careerSeries = [];
    for (const table of seriesTables) {
        // Look for series name in preceding header
        const prevElement = table.previousElementSibling;
        const seriesHeader = prevElement?.querySelector("th span[style*='font-size:180%'] b");
        const seriesName = seriesHeader?.textContent?.trim();
        
        if (!seriesName) continue;
        
        // Get season rows
        const seasonRows = table.querySelectorAll("tbody tr:not(:first-child)");
        const seasons = [];
        
        for (const row of seasonRows) {
            const yearLink = row.querySelector("th a");
            const year = yearLink?.textContent?.trim();
            const cells = row.querySelectorAll("td");
            
            if (year && cells.length >= 6) {
                seasons.push({
                    year: parseInt(year, 10),
                    starts: cells[0]?.textContent?.trim(),
                    wins: parseInt(cells[1]?.textContent?.trim() ?? "0", 10),
                    top5s: parseInt(cells[2]?.textContent?.trim() ?? "0", 10),
                    top10s: parseInt(cells[3]?.textContent?.trim() ?? "0", 10),
                    poles: parseInt(cells[4]?.textContent?.trim() ?? "0", 10),
                    standing: cells[5]?.textContent?.trim() || null
                });
            }
        }
        
        if (seasons.length > 0) {
            careerSeries.push({ seriesName, seasons });
        }
    }
    
    console.log({ driverInfo, careerSeries });
    // Returns: { driverInfo: { fullName: "Fernando Alonso", nickname: "Teflonso", ... }, careerSeries: [...] }
    ```


- **Track Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Circuit_Name}`
    - Source File: `docs/thethirdturn/autodromo_nazionale_di_monza.html`
    - Description: Contains information about a specific racing circuit or venue,
      including location, layout variations, and historical usage.
    - Data Points:
        - Circuit
            - Name : Main header text, e.g., "Autodromo Nazionale di Monza"
            - LengthMeters : Parsed from "3.6 mi./5.794 km." - convert to meters
            - TrackType : "Road Course", "Oval", "Street Circuit", etc.
            - Location : City parsed from "located in {City}, {Country}"
            - Country : Country parsed from location string
            - TrackStatus : "Still In Operation" or "Closed" (human-readable)
            - OpenedYear : Parsed from "(Opened: 1922)"
            - Latitude : Parsed from Google Maps link
            - Longitude : Parsed from Google Maps link
    - Example: https://thethirdturn.com/wiki/Autodromo_Nazionale_di_Monza
    - Useful Javascript:
    ```javascript
    // On: https://thethirdturn.com/wiki/Autodromo_Nazionale_di_Monza
    // Goal: Extract circuit info including location, type, status, and coordinates
    
    // --- CIRCUIT INFO ---
    const headerTable = document.querySelector("#mw-content-text table.newtracktable");
    const rows = headerTable?.querySelectorAll("tr td:first-child");
    
    // Name is in first row with 250% font
    const circuitName = rows?.[0]?.querySelector("span[style*='font-size:250%'] b")?.textContent?.trim();
    
    // Second row has length, type, and location
    // Format: "3.6 mi./5.794 km.  Road Course located in Monza, Italy"
    const infoText = rows?.[1]?.textContent?.trim();
    const infoMatch = infoText?.match(/^([\d.]+)\s*mi\.\/([\d.]+)\s*km\.\s+(.+?)\s+located in\s+(.+?),\s*(.+)$/i);
    
    const lengthMiles = infoMatch?.[1] ? parseFloat(infoMatch[1]) : null;
    const lengthKm = infoMatch?.[2] ? parseFloat(infoMatch[2]) : null;
    const lengthMeters = lengthKm ? Math.round(lengthKm * 1000) : null;
    const trackType = infoMatch?.[3]?.trim() ?? null;
    const city = infoMatch?.[4]?.trim() ?? null;
    const country = infoMatch?.[5]?.trim() ?? null;
    
    // Third row has status and opened year
    // Format: "Track Status: Still In Operation (Opened: 1922)"
    const statusText = rows?.[2]?.textContent?.trim();
    const statusMatch = statusText?.match(/Track Status:\s*(.+?)(?:\s*\(Opened:\s*(\d{4})\s*\))?$/i);
    const trackStatus = statusMatch?.[1]?.trim() ?? null;
    const openedYear = statusMatch?.[2] ? parseInt(statusMatch[2], 10) : null;
    
    // Fourth row has external links including Google Maps
    // Look for Google Maps link to extract coordinates
    const googleMapsLink = headerTable?.querySelector("a[href*='maps.google.com']");
    const mapsHref = googleMapsLink?.href;
    const coordsMatch = mapsHref?.match(/ll=([-\d.]+),([-\d.]+)/);
    const latitude = coordsMatch?.[1] ? parseFloat(coordsMatch[1]) : null;
    const longitude = coordsMatch?.[2] ? parseFloat(coordsMatch[2]) : null;
    
    const circuitInfo = {
        name: circuitName,
        lengthMiles,
        lengthKm,
        lengthMeters,
        trackType,
        city,
        country,
        location: city && country ? `${city}, ${country}` : null,
        trackStatus,
        openedYear,
        latitude,
        longitude
    };
    
    // --- RACE HISTORY ---
    // Get all race entries from the touring series table
    const historyTable = document.querySelector("#mw-content-text table.wikitable.sortable");
    const historyRows = historyTable?.querySelectorAll("tbody tr:not(:first-child)") ?? [];
    
    const raceHistory = [];
    for (const row of historyRows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 4) continue;
        
        const dateLink = cells[0]?.querySelector("a");
        const date = dateLink?.textContent?.trim() ?? cells[0]?.textContent?.trim();
        const raceHref = dateLink?.href ?? null;
        
        const sanctionLink = cells[1]?.querySelector("a");
        const sanction = sanctionLink?.textContent?.trim() ?? cells[1]?.textContent?.trim();
        
        const winnerLinks = cells[2]?.querySelectorAll("a");
        const winners = Array.from(winnerLinks).map(a => ({
            name: a.textContent?.trim(),
            href: a.href
        }));
        
        const laps = cells[3]?.textContent?.trim();
        
        raceHistory.push({
            date,
            raceHref,
            sanction,
            winners,
            laps: laps ? parseInt(laps, 10) : null
        });
    }
    
    console.log({ circuitInfo, raceHistory });
    // Returns: { circuitInfo: { name: "Autodromo Nazionale di Monza", lengthMeters: 5794, trackType: "Road Course", trackStatus: "Still In Operation", openedYear: 1922, latitude: 45.61765, longitude: 9.28109, ... }, raceHistory: [...] }
    ``` 