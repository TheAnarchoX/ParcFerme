# ErgastF1 postgreSQL DDL Documentation
```sql
-- ErgastF1 PostgreSQL DDL
create table public.circuits
(
    "circuitId"  integer,
    "circuitRef" varchar(255),
    name         varchar(255),
    location     varchar(255),
    country      varchar(255),
    lat          real,
    lng          real,
    alt          integer,
    url          varchar(255)
);

alter table public.circuits
    owner to parcferme;

create table public."constructorResults"
(
    "constructorResultsId" integer,
    "raceId"               integer,
    "constructorId"        integer,
    points                 real,
    status                 varchar(255)
);

alter table public."constructorResults"
    owner to parcferme;

create table public."constructorStandings"
(
    "constructorStandingsId" integer,
    "raceId"                 integer,
    "constructorId"          integer,
    points                   real,
    position                 integer,
    "positionText"           varchar(255),
    wins                     integer
);

alter table public."constructorStandings"
    owner to parcferme;

create table public.constructors
(
    "constructorId"  integer,
    "constructorRef" varchar(255),
    name             varchar(255),
    nationality      varchar(255),
    url              varchar(255)
);

alter table public.constructors
    owner to parcferme;

create table public."driverStandings"
(
    "driverStandingsId" integer,
    "raceId"            integer,
    "driverId"          integer,
    points              real,
    position            integer,
    "positionText"      varchar(255),
    wins                integer
);

alter table public."driverStandings"
    owner to parcferme;

create table public.drivers
(
    "driverId"  integer,
    "driverRef" varchar(255),
    number      integer,
    code        varchar(3),
    forename    varchar(255),
    surname     varchar(255),
    dob         date,
    nationality varchar(255),
    url         varchar(255)
);

alter table public.drivers
    owner to parcferme;

create table public."lapTimes"
(
    "raceId"     integer,
    "driverId"   integer,
    lap          integer,
    position     integer,
    time         varchar(255),
    milliseconds integer
);

alter table public."lapTimes"
    owner to parcferme;

create table public."pitStops"
(
    "raceId"     integer,
    "driverId"   integer,
    stop         integer,
    lap          integer,
    time         time,
    duration     varchar(255),
    milliseconds integer
);

alter table public."pitStops"
    owner to parcferme;

create table public.qualifying
(
    "qualifyId"     integer,
    "raceId"        integer,
    "driverId"      integer,
    "constructorId" integer,
    number          integer,
    position        integer,
    q1              varchar(255),
    q2              varchar(255),
    q3              varchar(255)
);

alter table public.qualifying
    owner to parcferme;

create table public.races
(
    "raceId"    integer,
    year        integer,
    round       integer,
    "circuitId" integer,
    name        varchar(255),
    date        date,
    time        time,
    url         varchar(255)
);

alter table public.races
    owner to parcferme;

create table public.results
(
    "resultId"        integer,
    "raceId"          integer,
    "driverId"        integer,
    "constructorId"   integer,
    number            integer,
    grid              integer,
    position          integer,
    "positionText"    varchar(255),
    "positionOrder"   integer,
    points            real,
    laps              integer,
    time              varchar(255),
    milliseconds      integer,
    "fastestLap"      integer,
    rank              integer,
    "fastestLapTime"  varchar(255),
    "fastestLapSpeed" varchar(255),
    "statusId"        integer
);

alter table public.results
    owner to parcferme;

create table public.seasons
(
    year integer,
    url  varchar(255)
);

alter table public.seasons
    owner to parcferme;

create table public.status
(
    "statusId" integer,
    status     varchar(255)
);

alter table public.status
    owner to parcferme;

create table public.target
(
    "targetId" integer,
    "raceId"   integer,
    "driverId" integer,
    win        integer
);

alter table public.target
    owner to parcferme;

```