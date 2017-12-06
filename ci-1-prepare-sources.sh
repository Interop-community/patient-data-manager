#!/usr/bin/env bash

set -e

echo "starting prepare_build.sh..."

echo "dynamically fix the container-definitions_prod.json"
sed -i -e "s/{{$PROJECT_NAME}}/$PROJECT_NAME/g" -e "s/{{PROJECT_VERSION}}/$PROJECT_VERSION/g" container-definitions_prod.json

if ! [ -s container-definitions_prod.json ]
then
  echo "container-definitions_prod.json is empty!"
  exit 1
end
fi

echo "dynamically fix the container-definitions_test.json"
sed -i -e "s/{{$PROJECT_NAME}}/$PROJECT_NAME/g" -e "s/{{PROJECT_VERSION}}/$PROJECT_VERSION/g" container-definitions_test.json

if ! [ -s container-definitions_test.json ]
then
  echo "container-definitions_test.json is empty!"
  exit 1
end
fi

echo "finished prepare_build.sh"
