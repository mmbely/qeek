#!/bin/bash

# Load environment variables
source .env

# Run the repository indexer in Docker
docker-compose run --rm backend-service src/cli.py "$@"

# Example usage:
# ./run-indexer.sh mmbely/qeek --account-id RnInDl1twWVwyWWMcEkB1sETtoq1 --skip-types jpg,png,gif,json