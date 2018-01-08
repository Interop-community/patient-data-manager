FROM node:alpine

RUN apk update && apk add bash
COPY . .
ARG ACTIVE_ENV
ENV ACTIVE_ENV=$ACTIVE_ENV
RUN echo $ACTIVE_ENV
#RUN chmod +x direct_manifest.sh
#CMD ["./direct_manifest.sh"]
RUN if [ "$ACTIVE_ENV" = "prod" ]; then rm /src/.well-known/smart/manifest.json; mv /src/.well-known/smart/manifest.prod.json /src/.well-known/smart/manifest.json; elif [ "$ACTIVE_ENV" = "test" ]; then rm /src/.well-known/smart/manifest.json; mv /src/.well-known/smart/manifest.test.json /src/.well-known/smart/manifest.json; fi
RUN npm install
RUN cat /src/.well-known/smart/manifest.json
CMD [ "npm", "run", "serve" ]