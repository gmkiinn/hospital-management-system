"""Static medicine catalog powering the prescription typeahead.

Reference data shared across tenants (not RLS-scoped). This is intentionally a
simple in-memory list for now; it can be promoted to a database table + admin
CRUD later without changing the API surface.
"""

# Common Indian OPD medicines (tablets, syrups, and a few devices).
MEDICINE_CATALOG: list[str] = [
    "Paracetamol 500mg",
    "Paracetamol 650mg",
    "Azithromycin 500mg",
    "Amoxicillin 500mg",
    "Amoxicillin + Clavulanate 625mg",
    "Cefixime 200mg",
    "Cefpodoxime 200mg",
    "Ciprofloxacin 500mg",
    "Levofloxacin 500mg",
    "Doxycycline 100mg",
    "Metronidazole 400mg",
    "Ofloxacin + Ornidazole",
    "Cetirizine 10mg",
    "Levocetirizine 5mg",
    "Fexofenadine 120mg",
    "Montelukast 10mg",
    "Montelukast + Levocetirizine",
    "Pantoprazole 40mg",
    "Omeprazole 20mg",
    "Rabeprazole 20mg",
    "Ranitidine 150mg",
    "Domperidone 10mg",
    "Ondansetron 4mg",
    "Dicyclomine 10mg",
    "Ibuprofen 400mg",
    "Diclofenac 50mg",
    "Aceclofenac 100mg",
    "Aceclofenac + Paracetamol",
    "Tramadol 50mg",
    "Metformin 500mg",
    "Metformin 1000mg",
    "Glimepiride 1mg",
    "Amlodipine 5mg",
    "Telmisartan 40mg",
    "Telmisartan + Amlodipine",
    "Losartan 50mg",
    "Atenolol 50mg",
    "Metoprolol 50mg",
    "Atorvastatin 10mg",
    "Rosuvastatin 10mg",
    "Aspirin 75mg",
    "Clopidogrel 75mg",
    "Prednisolone 10mg",
    "Deflazacort 6mg",
    "Thyroxine 50mcg",
    "Salbutamol Inhaler",
    "Budesonide Inhaler",
    "Vitamin D3 60000 IU",
    "Vitamin B-Complex",
    "Vitamin C 500mg",
    "Calcium + Vitamin D3",
    "Iron + Folic Acid",
    "Folic Acid 5mg",
    "ORS Sachet",
    "Zinc 20mg",
    "Ascoril Cough Syrup",
    "Benadryl Cough Syrup",
    "Cheston Cold",
    "Azee 500 Syrup",
    "Meftal-P Syrup",
    "Zincovit Syrup",
    "Cyra-D",
    "Pan-D",
]


def search_medicines(query: str | None, limit: int = 10) -> list[str]:
    """Case-insensitive substring search; empty query returns the top of the list."""
    if not query or not query.strip():
        return MEDICINE_CATALOG[:limit]
    q = query.strip().lower()
    return [name for name in MEDICINE_CATALOG if q in name.lower()][:limit]
