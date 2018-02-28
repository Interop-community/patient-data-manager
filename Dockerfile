FROM node:alpine

COPY . .
ARG TARGET_ENV
ENV TARGET_ENV=$TARGET_ENV
RUN if [ "$TARGET_ENV" = "prod" ]; then rm /src/.well-known/smart/manifest.json; mv /src/.well-known/smart/manifest.prod.json /src/.well-known/smart/manifest.json; elif [ "$TARGET_ENV" = "test" ]; then rm /src/.well-known/smart/manifest.json; mv /src/.well-known/smart/manifest.test.json /src/.well-known/smart/manifest.json; fi
RUN npm install
CMD [ "npm", "run", "serve" ]