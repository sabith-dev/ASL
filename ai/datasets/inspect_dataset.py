import pandas as pd

import os
import sys
_AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ai/
if _AI_ROOT not in sys.path:
    sys.path.insert(0, _AI_ROOT)

from ai._paths import DATASET_CSV

file_path = DATASET_CSV

df = pd.read_csv(file_path)

print("=" * 60)
print("DATASET INFORMATION")
print("=" * 60)

print("\nShape:")
print(df.shape)

print("\nColumns:")
for i, column in enumerate(df.columns):
    print(i, ":", column)

print("\nFirst 5 rows:")
print(df.head())

print("\nMissing values:")
print(df.isnull().sum())

print("\nData types:")
print(df.dtypes)

print("\nLast column value counts:")
print(df.iloc[:, -1].value_counts())

print("\nDuplicate rows:")
print(df.duplicated().sum())