FROM mhart/alpine-node
WORKDIR /src

COPY package.json .
RUN npm install
COPY . .

EXPOSE 80
CMD npm start
