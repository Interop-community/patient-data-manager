#!/usr/bin/env bash

set -e

echo "starting prepare_build.sh..."

echo "dynamically fix the container-definitions_prod.json"
export CONTAINER_NAME=$(mvn -q -Dexec.executable="echo" -Dexec.args='${project.artifactId}' --non-recursive exec:exec)
sed -i -e "s/{{CONTAINER_NAME}}/$CONTAINER_NAME/g" -e "s/{{PROJECT_VERSION}}/$PROJECT_VERSION/g" container-definitions_prod.json
export PROJECT_VERSION=$(cat package.json | jq --raw-output '.version')

if ! [ -s container-definitions_prod.json ]
then
  echo "container-definitions_prod.json is empty!"
  exit 1
end
fi

echo "dynamically fix the container-definitions_test.json"
export CONTAINER_NAME=$(mvn -q -Dexec.executable="echo" -Dexec.args='${project.artifactId}' --non-recursive exec:exec)
sed -i -e "s/{{CONTAINER_NAME}}/$CONTAINER_NAME/g" -e "s/{{PROJECT_VERSION}}/$PROJECT_VERSION/g" container-definitions_test.json
export PROJECT_VERSION=$(cat package.json | jq --raw-output '.version')

if ! [ -s container-definitions_test.json ]
then
  echo "container-definitions_test.json is empty!"
  exit 1
end
fi

echo "finished prepare_build.sh"
