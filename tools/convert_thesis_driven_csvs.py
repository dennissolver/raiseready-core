import pandas as pd
import numpy as np

def clean_contacts_field(value):
    if pd.isna(value):
        return []
    # Normalize delimiters
    value = value.replace("\n", ";").replace(",", ";")
    # Split on semicolons
    parts = [p.strip() for p in value.split(";") if p.strip() != ""]
    return parts

def explode_contacts(df, name_col="Contact Names", email_col="Emails"):
    rows = []

    for _, row in df.iterrows():
        names = clean_contacts_field(row[name_col])
        emails = clean_contacts_field(row[email_col])

        max_len = max(len(names), len(emails))

        # pad lists so lengths match
        names += [""] * (max_len - len(names))
        emails += [""] * (max_len - len(emails))

        for i in range(max_len):
            new_row = row.copy()
            new_row[name_col] = names[i]
            new_row[email_col] = emails[i]
            rows.append(new_row)

    return pd.DataFrame(rows)

# ---- MAIN PIPELINE ----

def process_investor_csv(input_path, output_path):
    df = pd.read_csv(input_path)

    # Standardise column names
    df.columns = [col.strip().title() for col in df.columns]

    # Run explode logic
    cleaned = explode_contacts(df,
                               name_col="Contact Names",
                               email_col="Emails")

    # Clean whitespace everywhere
    cleaned = cleaned.applymap(lambda x: x.strip() if isinstance(x, str) else x)

    cleaned.to_csv(output_path, index=False)
    print(f"Processed → {output_path}")

# Example usage:
process_investor_csv(
    "/mnt/data/New_Thesis_Driven_Capital_Stack.csv",
    "/mnt/data/Thesis_Driven_Cleaned_Output.csv"
)
