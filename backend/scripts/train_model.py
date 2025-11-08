import sys
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from joblib import dump

csv_path = sys.argv[1]  # CSV file path

df = pd.read_csv(csv_path)

X = df.drop(columns=["machine_status"])
y = df["machine_status"].replace({"NORMAL": 0, "BROKEN": 1, "RECOVERING": 2})

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

dump(model, "backend/model/model.pkl")

print("TRAINING_DONE")
