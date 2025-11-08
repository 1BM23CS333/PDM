import sys
import json
import pickle
import numpy as np

# Load model & scalers
model = pickle.load(open("model.pkl", "rb"))
scaler = pickle.load(open("scaler.pkl", "rb"))
encoder = pickle.load(open("label_encoder.pkl", "rb"))

# Read input passed from Node
raw_data = json.loads(sys.argv[1])

# Convert to array
values = np.array(list(raw_data.values())).reshape(1, -1)

# Scale data
scaled = scaler.transform(values)

# Predict
pred = model.predict(scaled)
status = encoder.inverse_transform(pred)[0]

# Print as JSON for Node to parse
print(json.dumps({"status": status}))
