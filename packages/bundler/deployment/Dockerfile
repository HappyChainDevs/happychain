# production ready dockerfile that runs pnpm start
FROM node:20.12.2-alpine3.19

# set working directory
WORKDIR /app

# install typescript
RUN npm add -g typescript

# copy package.json and pnpm-lock.yaml
COPY ./alto/package.json ./alto/pnpm-lock.yaml ./alto/pnpm-workspace.yaml ./

# install pnpm and create global pnpm symlink
RUN corepack install && corepack enable

# copy source code
COPY ./alto .

# copy config
COPY ./configs/config.happySepolia.json ./config.json

# copy entrypoint
COPY ./deployment/entrypoint.sh ./entrypoint.sh

# make entrypoint executable
RUN chmod +x ./entrypoint.sh

# fetch dependencies
RUN pnpm fetch

# install dependencies
RUN pnpm install -r

# copy source code
RUN pnpm build

# prune dev dependencies
RUN pnpm prune --prod

# start app
ENTRYPOINT ["./entrypoint.sh"]
