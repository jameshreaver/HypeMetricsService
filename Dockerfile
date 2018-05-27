FROM mhart/alpine-node
WORKDIR /src

COPY package.json .
RUN npm install
COPY . .

EXPOSE 80
EXPOSE 4888
CMD npm start
