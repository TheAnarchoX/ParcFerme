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

## URL Structure

The Third Turn organizes its data in a hierarchical URL structure. The
base URL is:

```
https://www.thethirdturn.com/wiki/
```

From there, different types of data can be accessed via specific URL
patterns:

> The "Data Points" sections below indicate which Parc Ferme data models and contains direct column mappings, see [EventModel.cs](/src/api/Models/EventModels.cs) for more details.

- **Series Database Index**: 
    - URL: `https://thethirdturn.com/wiki/Series_Database:Index`
    - Description: Lists all racing series available in the database.
    - Data Points (Model: Series):
        - Name: From data {link.text} 
        - Slug : Slugify from Name
        - SeriesAlias[]
            - AliasName : See the `getAlternativeNames` function below for extracting alternative names from series pages.
            - AliasSlug : Slugify from AliasName
            - ValidFrom : Also, see `getAlternativeNames` for date extraction.
            - ValidTo : Also, see `getAlternativeNames` for date extraction.
            - Source : "The Third Turn"
    - Javscript to get all series names and URLS as json:
    ```javascript
    // 1. Select all matching links
    const links = document.querySelectorAll("#mw-content-text > div > table > tbody > tr > td > p > a");

    // 2. Convert the NodeList to an array and map it to a structured object
    const data = Array.from(links).map(link => {
    return {
        text: link.textContent.trim(), // The visible text of the link
        href: link.href                // The URL the link points to
    };
    });
    ```

    this will give you an array of objects with `text` and `href` properties for each series link.

    Which you can then fetch each series page to get more detailed data.

- **Individual Series Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Series_Name}`
    - Description: Contains detailed information about a specific racing series,
      including links to seasons and drivers.
    - Data Points (Model: Season):
        - Year (from season links)
        - Season URL
    - Example: `https://thethirdturn.com/wiki/NASCAR_Cup_Series_Central`
    - Useful Links:
        - Drivers List: `https://thethirdturn.com/wiki/{Series_Name}/Drivers`
    - Useful Javascript to get all Seasons as json:
    ```javascript
    // 1. Select all matching links using the generalized selector
    // Note: I removed specific indices from div, tr, and td to get everything.
    const links = document.querySelectorAll("#mw-content-text > div > div > table > tbody > tr > td > a");

    // 2. Map the results to a structured object
    const data = Array.from(links).map(link => {
    return {
        text: link.textContent.trim(),
        href: link.href
    };
    });
    ```
    This will give you an array of objects with `text` and `href` properties for each season link.

    The only data we need to create a season is the year, which is in the text property of each link.
    The href property can be used to fetch the season page for more detailed data if needed.

- **Individual Season Page**:
    - URL Pattern: `https://thethirdturn.com/wiki/{Season_Name}`
    - Description: Contains detailed information about a specific season, containing data and links 
      about races, drivers, and results.
    - Data Points
        - Model: Round
            - Name : 
    - Example: `https://thethirdturn.com/wiki/1949_NASCAR_Strictly_Stock_Central`
    - Useful Links:
        - Races List: `https://thethirdturn.com/wiki/{Series_Name}