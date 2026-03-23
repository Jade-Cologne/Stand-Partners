"""
Seed script — run once to populate the orchestras table with known ensembles.
Usage: python -m app.seed.orchestras
"""

from app.database import SessionLocal, engine
from app.models import Base, Orchestra, OrchestraType

SEED_ORCHESTRAS = [
    # ── Major / ICSOM ──────────────────────────────────────────────────────────
    {
        "name": "New York Philharmonic",
        "type": OrchestraType.professional,
        "city": "New York", "state": "NY", "country": "US",
        "lat": 40.7724, "lng": -73.9836,
        "website": "https://nyphil.org",
        "audition_page": "https://nyphil.org/about-us/careers",
    },
    {
        "name": "Chicago Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Chicago", "state": "IL", "country": "US",
        "lat": 41.8796, "lng": -87.6237,
        "website": "https://cso.org",
        "audition_page": "https://cso.org/about/auditions/",
    },
    {
        "name": "Los Angeles Philharmonic",
        "type": OrchestraType.professional,
        "city": "Los Angeles", "state": "CA", "country": "US",
        "lat": 34.0553, "lng": -118.2996,
        "website": "https://laphil.com",
        "audition_page": "https://laphil.com/about/jobs",
    },
    {
        "name": "Boston Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Boston", "state": "MA", "country": "US",
        "lat": 42.3428, "lng": -71.0858,
        "website": "https://bso.org",
        "audition_page": "https://bso.org/about/employment",
    },
    {
        "name": "Philadelphia Orchestra",
        "type": OrchestraType.professional,
        "city": "Philadelphia", "state": "PA", "country": "US",
        "lat": 39.9525, "lng": -75.1652,
        "website": "https://philorch.org",
        "audition_page": "https://philorch.org/about/employment",
    },
    {
        "name": "Cleveland Orchestra",
        "type": OrchestraType.professional,
        "city": "Cleveland", "state": "OH", "country": "US",
        "lat": 41.5085, "lng": -81.6068,
        "website": "https://clevelandorchestra.com",
        "audition_page": "https://clevelandorchestra.com/about/auditions/",
    },
    {
        "name": "San Francisco Symphony",
        "type": OrchestraType.professional,
        "city": "San Francisco", "state": "CA", "country": "US",
        "lat": 37.7774, "lng": -122.4196,
        "website": "https://sfsymphony.org",
        "audition_page": "https://sfsymphony.org/about/employment",
    },
    {
        "name": "Minnesota Orchestra",
        "type": OrchestraType.professional,
        "city": "Minneapolis", "state": "MN", "country": "US",
        "lat": 44.9748, "lng": -93.2771,
        "website": "https://minnesotaorchestra.org",
        "audition_page": "https://minnesotaorchestra.org/about/employment",
    },
    {
        "name": "Pittsburgh Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Pittsburgh", "state": "PA", "country": "US",
        "lat": 40.4440, "lng": -79.9959,
        "website": "https://pittsburghsymphony.org",
        "audition_page": "https://pittsburghsymphony.org/about-us/employment",
    },
    {
        "name": "Detroit Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Detroit", "state": "MI", "country": "US",
        "lat": 42.3314, "lng": -83.0458,
        "website": "https://dso.org",
        "audition_page": "https://dso.org/about/employment",
    },
    {
        "name": "National Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Washington", "state": "DC", "country": "US",
        "lat": 38.8893, "lng": -77.0199,
        "website": "https://kennedy-center.org/nso",
        "audition_page": "https://kennedy-center.org/nso/about/employment/",
    },
    {
        "name": "Atlanta Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Atlanta", "state": "GA", "country": "US",
        "lat": 33.7490, "lng": -84.3880,
        "website": "https://atlantasymphony.org",
        "audition_page": "https://atlantasymphony.org/about/employment",
    },
    {
        "name": "Seattle Symphony",
        "type": OrchestraType.professional,
        "city": "Seattle", "state": "WA", "country": "US",
        "lat": 47.6080, "lng": -122.3352,
        "website": "https://seattlesymphony.org",
        "audition_page": "https://seattlesymphony.org/about/careers",
    },
    {
        "name": "Dallas Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Dallas", "state": "TX", "country": "US",
        "lat": 32.7767, "lng": -96.8089,
        "website": "https://dallassymphony.org",
        "audition_page": "https://dallassymphony.org/about/employment",
    },
    {
        "name": "Houston Symphony",
        "type": OrchestraType.professional,
        "city": "Houston", "state": "TX", "country": "US",
        "lat": 29.7604, "lng": -95.3698,
        "website": "https://houstonsymphony.org",
        "audition_page": "https://houstonsymphony.org/about/employment",
    },
    # ── ROPA / Regional ────────────────────────────────────────────────────────
    {
        "name": "Oregon Symphony",
        "type": OrchestraType.regional,
        "city": "Portland", "state": "OR", "country": "US",
        "lat": 45.5051, "lng": -122.6750,
        "website": "https://oregonsymphony.org",
        "audition_page": "https://oregonsymphony.org/about/employment/",
    },
    {
        "name": "Rochester Philharmonic Orchestra",
        "type": OrchestraType.regional,
        "city": "Rochester", "state": "NY", "country": "US",
        "lat": 43.1566, "lng": -77.6088,
        "website": "https://rpo.org",
        "audition_page": "https://rpo.org/about/employment",
    },
    {
        "name": "Louisville Orchestra",
        "type": OrchestraType.regional,
        "city": "Louisville", "state": "KY", "country": "US",
        "lat": 38.2527, "lng": -85.7585,
        "website": "https://louisvilleorchestra.org",
        "audition_page": "https://louisvilleorchestra.org/about/employment",
    },
    {
        "name": "Colorado Symphony",
        "type": OrchestraType.regional,
        "city": "Denver", "state": "CO", "country": "US",
        "lat": 39.7392, "lng": -104.9903,
        "website": "https://coloradosymphony.org",
        "audition_page": "https://coloradosymphony.org/about/employment/",
    },
    {
        "name": "Kansas City Symphony",
        "type": OrchestraType.regional,
        "city": "Kansas City", "state": "MO", "country": "US",
        "lat": 39.0997, "lng": -94.5786,
        "website": "https://kcsymphony.org",
        "audition_page": "https://kcsymphony.org/about/employment",
    },
    {
        "name": "Nashville Symphony",
        "type": OrchestraType.professional,
        "city": "Nashville", "state": "TN", "country": "US",
        "lat": 36.1627, "lng": -86.7816,
        "website": "https://nashvillesymphony.org",
        "audition_page": "https://nashvillesymphony.org/about/employment/",
    },
    {
        "name": "Saint Louis Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Saint Louis", "state": "MO", "country": "US",
        "lat": 38.6270, "lng": -90.1994,
        "website": "https://slso.org",
        "audition_page": "https://slso.org/about/employment",
    },
    {
        "name": "Cincinnati Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Cincinnati", "state": "OH", "country": "US",
        "lat": 39.1031, "lng": -84.5120,
        "website": "https://cincinnatisymphony.org",
        "audition_page": "https://cincinnatisymphony.org/about/employment",
    },
    {
        "name": "Indianapolis Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Indianapolis", "state": "IN", "country": "US",
        "lat": 39.7684, "lng": -86.1581,
        "website": "https://indianapolissymphony.org",
        "audition_page": "https://indianapolissymphony.org/about/employment",
    },
    {
        "name": "Baltimore Symphony Orchestra",
        "type": OrchestraType.professional,
        "city": "Baltimore", "state": "MD", "country": "US",
        "lat": 39.2904, "lng": -76.6122,
        "website": "https://bsomusic.org",
        "audition_page": "https://bsomusic.org/about/employment",
    },
    # ── From Claude discovery test ──────────────────────────────────────────────
    {"name": "Bozeman Symphony Orchestra", "type": OrchestraType.regional, "city": "Bozeman", "state": "MT", "country": "US", "lat": 45.6770, "lng": -111.0429, "website": "https://www.bozemansymphony.org"},
    {"name": "Duluth Superior Symphony Orchestra", "type": OrchestraType.regional, "city": "Duluth", "state": "MN", "country": "US", "lat": 46.7867, "lng": -92.1005, "website": None},
    {"name": "Traverse Symphony Orchestra", "type": OrchestraType.regional, "city": "Traverse City", "state": "MI", "country": "US", "lat": 44.7631, "lng": -85.6206, "website": None},
    {"name": "Flagstaff Symphony Orchestra", "type": OrchestraType.regional, "city": "Flagstaff", "state": "AZ", "country": "US", "lat": 35.1983, "lng": -111.6513, "website": "https://www.flagstaffsymphony.org"},
    {"name": "Shreveport Symphony Orchestra", "type": OrchestraType.regional, "city": "Shreveport", "state": "LA", "country": "US", "lat": 32.5252, "lng": -93.7502, "website": None},
    {"name": "Lima Symphony Orchestra", "type": OrchestraType.regional, "city": "Lima", "state": "OH", "country": "US", "lat": 40.7420, "lng": -84.1052, "website": None},
    {"name": "Billings Symphony Orchestra", "type": OrchestraType.regional, "city": "Billings", "state": "MT", "country": "US", "lat": 45.7833, "lng": -108.5007, "website": None},
    {"name": "Santa Cruz Symphony", "type": OrchestraType.regional, "city": "Santa Cruz", "state": "CA", "country": "US", "lat": 36.9741, "lng": -122.0308, "website": None},
    {"name": "Champaign-Urbana Symphony Orchestra", "type": OrchestraType.regional, "city": "Champaign", "state": "IL", "country": "US", "lat": 40.1164, "lng": -88.2434, "website": None},
    {"name": "Youngstown Symphony Orchestra", "type": OrchestraType.regional, "city": "Youngstown", "state": "OH", "country": "US", "lat": 41.0998, "lng": -80.6495, "website": None},
    {"name": "Midland Symphony Orchestra", "type": OrchestraType.regional, "city": "Midland", "state": "MI", "country": "US", "lat": 43.6156, "lng": -84.2472, "website": None},
    {"name": "Cape Cod Symphony Orchestra", "type": OrchestraType.regional, "city": "Yarmouth Port", "state": "MA", "country": "US", "lat": 41.7073, "lng": -70.2273, "website": None},
    {"name": "Amarillo Symphony", "type": OrchestraType.regional, "city": "Amarillo", "state": "TX", "country": "US", "lat": 35.2220, "lng": -101.8313, "website": None},
    {"name": "Anchorage Symphony Orchestra", "type": OrchestraType.regional, "city": "Anchorage", "state": "AK", "country": "US", "lat": 61.2181, "lng": -149.9003, "website": None},
    {"name": "Quad City Symphony Orchestra", "type": OrchestraType.regional, "city": "Davenport", "state": "IA", "country": "US", "lat": 41.5236, "lng": -90.5776, "website": None},
    {"name": "Vermont Symphony Orchestra", "type": OrchestraType.regional, "city": "Burlington", "state": "VT", "country": "US", "lat": 44.4759, "lng": -73.2121, "website": None},
    {"name": "Wichita Falls Symphony Orchestra", "type": OrchestraType.regional, "city": "Wichita Falls", "state": "TX", "country": "US", "lat": 33.9137, "lng": -98.4934, "website": None},
    {"name": "New Hampshire Philharmonic Orchestra", "type": OrchestraType.community, "city": "Salem", "state": "NH", "country": "US", "lat": 42.7898, "lng": -71.2011, "website": None},
    {"name": "Roanoke Symphony Orchestra", "type": OrchestraType.regional, "city": "Roanoke", "state": "VA", "country": "US", "lat": 37.2710, "lng": -79.9414, "website": None},
    {"name": "Great Falls Symphony", "type": OrchestraType.regional, "city": "Great Falls", "state": "MT", "country": "US", "lat": 47.5002, "lng": -111.3008, "website": None},
]


def seed():
    db = SessionLocal()
    try:
        existing = {o.name for o in db.query(Orchestra.name).all()}
        added = 0
        for data in SEED_ORCHESTRAS:
            if data["name"] not in existing:
                db.add(Orchestra(**data))
                added += 1
        db.commit()
        print(f"Seeded {added} orchestras ({len(existing)} already existed).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
