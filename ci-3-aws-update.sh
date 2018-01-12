#!/usr/bin/env bash

set -e

echo "starting ci-3-aws-update.sh..."
export TASK_VERSION=$(aws ecs register-task-definition --family $1 --container-definitions $(cat container-definitions_test.json | jq -c '.')  | jq --raw-output '.taskDefinition.revision')
echo "TASK_VERSION: $TASK_VERSION"

echo "BITBUCKET_BRANCH: $BITBUCKET_BRANCH"
if [ ! -z "$BITBUCKET_BRANCH" ] && [ "$BITBUCKET_BRANCH" == "develop" ]
then
    [[ -z "$TARGET_AWS_CLUSTER" ]] && { echo "Error: TARGET_AWS_CLUSTER is not provided"; exit 1; } || echo "TARGET_AWS_CLUSTER: $TARGET_AWS_CLUSTER"
    [[ -z "$TARGET_AWS_SERVICE" ]] && { echo "Error: TARGET_AWS_SERVICE is not provided"; exit 1; } || echo "TARGET_AWS_SERVICE: $TARGET_AWS_SERVICE"

    echo "updating aws esc service..."
    aws ecs update-service --cluster $TARGET_AWS_CLUSTER --service $TARGET_AWS_SERVICE --task-definition $PROJECT_NAME:$TASK_VERSION
else
    echo "skipping deployment"
fi

echo "finished ci-3-aws-update.sh"
