#!/bin/bash

# Default values
SCENARIO="constant"
TEST_FILE=""
API_URL="http://localhost:3000"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -s|--scenario)
      SCENARIO="$2"
      shift
      shift
      ;;
    -f|--file)
      TEST_FILE="$2"
      shift
      shift
      ;;
    -u|--url)
      API_URL="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate inputs
if [ -z "$TEST_FILE" ]; then
  echo "Error: Test file is required. Use -f or --file to specify the test file."
  exit 1
fi

# Available scenarios
case $SCENARIO in
  constant|rampUp|stress|spike)
    echo "Running $SCENARIO load test scenario..."
    ;;
  *)
    echo "Error: Invalid scenario. Choose from: constant, rampUp, stress, spike"
    exit 1
    ;;
esac

# Run k6 with the specified configuration
k6 run \
  -e API_URL=$API_URL \
  -e SCENARIO=$SCENARIO \
  "tests/load/scenarios/$TEST_FILE"

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Load test completed successfully!"
else
  echo "Load test failed!"
  exit 1
fi