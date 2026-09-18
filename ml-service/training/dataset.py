"""Sample complaint dataset generation.

Generates a deterministic, labeled CSV of synthetic (but representative)
complaints across the 12 service categories, including priority labels.
No real resident data is used; all identifiers/locations are fabricated.
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

CATEGORIES: List[str] = [
    "Water Supply",
    "Electricity",
    "Roads",
    "Garbage/Waste",
    "Drainage",
    "Street Lights",
    "Public Transport",
    "Traffic",
    "Public Safety",
    "Sanitation",
    "Government Services",
    "Other",
]

PRIORITIES = ["Low", "Medium", "High", "Critical"]

AREAS = [
    "anna nagar", "kannagi street", "main road near the market", "block b",
    "kamaraj colony", "jubilee bus stop", "lake view road", "gandhi street",
    "sector 12", "near the city school", "mg road", "first cross street",
]

DAYS = ["2", "3", "5", "7", "10", "15", "20"]

# (category, priority, [templates]) - templates use {area} and {days}.
TEMPLATES: Dict[str, List[Tuple[str, List[str]]]] = {
    "Water Supply": [
        ("High", [
            "no water supply in {area} for {days} days affecting many houses",
            "water has been completely cut off in {area} since yesterday morning",
            "the main pipeline supplying {area} has stopped working",
            "not receiving drinking water in {area} for three days",
        ]),
        ("Medium", [
            "water pressure is very low in {area} during morning hours",
            "tank water not filled in {area} for this week",
            "water comes only for a few minutes in {area} these days",
        ]),
        ("Critical", [
            "verge water pipeline has burst and water is flooding the road in {area}",
            "water leakage from the main line is wasting huge amounts and flooding {area}",
        ]),
    ],
    "Electricity": [
        ("High", [
            "power cut for {days} hours every day in {area}",
            "electricity is failing repeatedly in {area} damaging appliances",
            "voltage fluctuation is very high in {area} and appliances are getting damaged",
        ]),
        ("Medium", [
            "no power supply in {area} during evening hours",
            "transformer in {area} makes noise and trips often",
        ]),
        ("Low", [
            "power restoration was slightly delayed in {area} last week",
        ]),
    ],
    "Roads": [
        ("High", [
            "a large pothole on the {area} damaged my vehicle",
            "road near {area} has big cracks and is unsafe for two wheelers",
            "the road in {area} has a deep ditch causing frequent accidents",
        ]),
        ("Medium", [
            "road surface in {area} is uneven and needs repair",
            "speed breakers in {area} are damaged and not visible at night",
        ]),
        ("Low", [
            "small patches of crumbling road surface near {area}",
            "paint markings on the road at {area} have faded",
        ]),
    ],
    "Garbage/Waste": [
        ("High", [
            "garbage has not been collected for one week in {area} and there is a bad smell",
            "waste is piling up for {days} days in {area} causing a health hazard",
        ]),
        ("Medium", [
            "garbage bins in {area} are overflowing and need urgent emptying",
            "no garbage collection in {area} for the last two days",
        ]),
        ("Low", [
            "loose garbage on the corner of {area} occasionally",
        ]),
    ],
    "Drainage": [
        ("High", [
            "drainage water is overflowing onto the road in {area}",
            "sewage is blocked in {area} and flowing back into houses",
            "open drain in {area} is clogged and water logs the street",
        ]),
        ("Critical", [
            "sewage flooding the street in {area} is a serious health risk for children",
            "drain overflow near {area} school is creating a dangerous unhygienic situation",
        ]),
        ("Medium", [
            "drainage in {area} is slow and water stays for long",
        ]),
    ],
    "Street Lights": [
        ("High", [
            "street light near {area} has not been working for {days} days",
            "streetlight in {area} remains off for several days",
            "lamps in {area} are not glowing since last week",
            "all street lights are dark in {area} creating safety issues at night",
            "street lights in {area} are off and the area is completely dark after sunset",
        ]),
        ("Low", [
            "a single street lamp in {area} flickers occasionally",
        ]),
    ],
    "Public Transport": [
        ("Medium", [
            "bus #42 in {area} frequently delays in the morning",
            "metro service at {area} has long gaps during office hours",
        ]),
        ("Low", [
            "bus stop at {area} lacks shade and seating",
            "some town buses skip the {area} stop without notice",
        ]),
        ("High", [
            "buses skip {area} stop entirely hurting commuters who reach office late",
        ]),
    ],
    "Traffic": [
        ("Medium", [
            "traffic signal near {area} is not working causing long jams",
            "rush hour congestion at {area} junction has increased a lot",
        ]),
        ("High", [
            "rash driving near {area} has caused two accidents this week",
            "heavy vehicles park near {area} blocking visibility and traffic",
        ]),
        ("Low", [
            "parking rules are not followed near the {area} market on weekends",
        ]),
    ],
    "Public Safety": [
        ("Critical", [
            "an abandoned building near {area} is open and children play inside",
            "open manhole on the {area} road is a serious hazard for pedestrians",
            "electrical wires are hanging dangerously low near {area}",
        ]),
        ("High", [
            "stray dogs are aggressive near {area} school in the morning",
            "a collapsed structure on {area} street is partially blocking the way",
        ]),
        ("Medium", [
            "dark zone at {area} due to missing lights is affecting safety",
        ]),
    ],
    "Sanitation": [
        ("Medium", [
            "mosquito breeding in stagnant water around {area} has increased",
            "public toilet near {area} is very dirty and needs cleaning",
        ]),
        ("High", [
            "unhygienic conditions near {area} market with piles of waste",
        ]),
        ("Low", [
            "a park at {area} needs routine cleaning and maintenance",
        ]),
    ],
    "Government Services": [
        ("Medium", [
            "ration card update at {area} office is pending for weeks",
            "birth certificate application submitted at {area} is not processed",
        ]),
        ("Low", [
            "civic office at {area} has long waiting times for certificates",
            "pension verification camps in {area} are infrequent",
        ]),
        ("High", [
            "water bill shows wrong readings for {area} house and service is stalled",
        ]),
    ],
    "Other": [
        ("Low", [
            "suggestion to install a public notice board at {area}",
            "request for more CCTV cameras in {area} park",
        ]),
        ("Medium", [
            "trees on {area} road have grown over power lines and need trimming",
            "a community event created noise in {area} for several hours",
        ]),
    ],
}

RESOLUTION_SUMMARIES: Dict[str, str] = {
    "Water Supply": "Water supply issue addressed and supply restored.",
    "Electricity": "Electrical fault attended and service restored.",
    "Roads": "Road repair work completed.",
    "Garbage/Waste": "Garbage collected and area cleaned.",
    "Drainage": "Drain cleared and de-flooded.",
    "Street Lights": "Street light repaired and working.",
    "Public Transport": "Transport issue escalated to the operator.",
    "Traffic": "Traffic management improved at the location.",
    "Public Safety": "Safety hazard secured by the department.",
    "Sanitation": "Sanitation resolved and area sanitized.",
    "Government Services": "Civic request processed.",
    "Other": "Complaint reviewed and actioned.",
}


def generate_dataset(rows_per_category: int = 40, seed: int = 42) -> pd.DataFrame:
    """Produce a labeled DataFrame with complaint_id, title, text, category, priority..."""
    rng = random.Random(seed)
    records: List[dict] = []
    counter = 1
    for category in CATEGORIES:
        for _ in range(rows_per_category):
            priority, templates = rng.choice(TEMPLATES[category])
            text = rng.choice(templates).format(area=rng.choice(AREAS), days=rng.choice(DAYS))
            # Small natural-language noise for the classifier to tolerate.
            if rng.random() < 0.35:
                text = f"{text} please look into this as soon as possible"
            text = text[0].upper() + text[1:] + "."
            title = " ".join(text.split(" ")[:8]).rstrip(".").removesuffix(".")
            records.append(
                {
                    "complaint_id": f"CMP{counter:04d}",
                    "title": title,
                    "text": text,
                    "category": category,
                    "priority": priority,
                    "location": rng.choice(AREAS).title(),
                    # "existing": 1 -> included in the duplicate-detection index.
                    "existing": 1 if counter % 5 != 0 else 0,
                    "resolution_summary": RESOLUTION_SUMMARIES[category],
                }
            )
            counter += 1
    return pd.DataFrame(records)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the sample complaint dataset CSV.")
    parser.add_argument("--output", default="data/raw/complaints.csv", help="Output CSV path.")
    parser.add_argument("--rows-per-category", type=int, default=40)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    frame = generate_dataset(rows_per_category=args.rows_per_category, seed=args.seed)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(out, index=False)
    print(f"Generated {len(frame)} complaints -> {out}")
    print(frame.groupby("category").size().to_string())


if __name__ == "__main__":
    main()