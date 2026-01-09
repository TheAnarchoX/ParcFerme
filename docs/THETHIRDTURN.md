# The Third Turn Data Source

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
    - Description: Lists all racing series available in the database.
    - Data Points: 
        - Series
            - Name: From data {seriesLinks[].name} in the series list.
            - Slug : Slugify from Name
    - Javscript to get all series names, URLs, and GoverningBody as json:
    ```javascript
    // On: https://thethirdturn.com/wiki/Series_Database:Index
    // Goal: extract [{ name, href, governingBody }, ...] robustly (avoid brittle childNodes indexing)

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
    - Description: Contains detailed information about a specific season, containing data and links to individual races
      about races, drivers, and results.
    - Data Points:
        - Round
            - Name : "{Season.Series.Year} {Season.Series.Name} Round {raceListings[].round_number}" # This is going to be objectively wrong for some series but it's the best we can do with the data available.
            - DateStart : {raceListings[].date}
    - Example: `https://thethirdturn.com/wiki/1949_NASCAR_Strictly_Stock_Central`
    - Useful Javascript to get all Races as json:
    ```javascript
    // 1. Select all rows matching race listings (excluding title and header row)
    // Note: I removed specific indices from div, tr, and td to get everything.
    const racesRows = document.querySelectorAll("#mw-content-text > div > table.pointtable.sortable.resultdiv.jquery-tablesorter");


// TODO: Outline data ingestion for these pages

- ** Individual Race Page**:

- ** Driver Page**:

- ** Circuit Page**: 