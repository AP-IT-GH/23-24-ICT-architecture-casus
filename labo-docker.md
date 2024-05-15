# Labo

In dit labo starten we de eerder gemaakte microservices automatisch op via een Docker configuratie.
1. We maken Dockerfiles om images te builden
2. We zetten een docker-compose.yml file op
3. We voegen de nodige security configuratie toe 

Opgelet: voer eerst het Webserver labo uit.

We zullen zoals eerder het labo via Cloud9 uitvoeren. De Cloud9 machine heeft reeds een Docker versie geïnstalleerd staan.

## Dockerfiles

### Webserver

Om de webserver via Docker te kunnen uitvoeren, voegen we een Dockerfile configuratie toe. Voeg deze file toe in de `./app` folder.

```Dockerfile
FROM node:20-bullseye as build
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install --frozen-lockfile

COPY . .
CMD [ "node", "./src/index.js" ]
EXPOSE 3000
```

Voeg meteen ook een .dockerignore bestand toe aan deze folder. Dit zorgt ervoor dat deze bestanden niet worden meegekopiëerd.

```.dockerignore
.env
node_modules/
```

Build de image `app` vervolgens met:

> docker build -t app .

### Img resize module

Zelfde opdracht voor de image resize module. In dit geval hoeven we geen poort te exposen. Voeg deze file toe in de `./img-resize` folder.

```Dockerfile
FROM node:20-bullseye as build
WORKDIR /img-resize
COPY package.json .
COPY package-lock.json .
RUN npm install --frozen-lockfile

COPY . .
CMD [ "node", "./index.js" ]
```

Voeg meteen ook een .dockerignore bestand toe aan deze folder. Dit zorgt ervoor dat deze bestanden niet worden meegekopiëerd.

```.dockerignore
.env
node_modules/
```

Build de image `img-resize` vervolgens met:

> docker build -t img-resize .

## Docker compose file

Docker-compose staat niet standaard geïnstalleerd. Installeer met
> sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

> sudo chmod +x /usr/local/bin/docker-compose

De `docker-compose.yml` file maak je aan 1 niveau hoger, dus op de root van je repository. Vul je eigen configuratie in.

```yml
services:
  app:
    image: app
    ports:
      - "80:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:Gm7Mgvfbmhjx9IcVUtDm@projectopdracht.cz88w0mccllr.us-east-1.rds.amazonaws.com/postgres
      - QUEUE_URL=https://sqs.us-east-1.amazonaws.com/058264264638/dries-projectopdracht
      - BUCKET=dries-projectopdracht-ict
      - REGION=us-east-1
    
  img-resize:
    image: img-resize
    environment:
      - QUEUE_URL=https://sqs.us-east-1.amazonaws.com/058264264638/dries-projectopdracht
      - BUCKET=dries-projectopdracht-ict
      - REGION=us-east-1
```

Start je docker compose met: 

> docker-compose up -d

Bekijk de output logs! (your best friend)

> docker-compose logs

Je kan lokaal testen of de webserver werkt

> curl http://localhost:80

Wil je kijken of het ook extern werkt, zorg dan dat je de juiste security instelt door een nieuwe security group aan te maken en poort 80 binnen te laten.

### Troubleshooting

We krijgen nu 2 foutmeldingen:
1. We kunnen geen bestand opladen (connectie met S3)
2. Polling werkt niet. *Error: Region is missing*

Verder stopt de webserver wanneer er een fout optreedt.

Wat is er aan de hand? Onze docker omgeving is geisoleerd van de host machine, dus we hebben ook geen security context waarin de connectie naar S3 of SQS kan opgezet worden. 

Beide containers draaien een Debian Bullseye omgeving. We hebben niets aangepast, dus de processen worden als `root` user uitgevoerd.

Binnen de Cloud9 omgeving voeren we de processen uit als `ec2-user`.

Eén optie (diegene die we zullen gebruiken) is ervoor zorgen dat de `~/.aws/credentials` file die op het hostsysteem staat, beschikbaar wordt binnen de container.

We voegen de credentials toe als volume mount, en we passen meteen de restart policy aan.

```yml
services:
  app:
    image: app
    restart: unless-stopped
    ports:
      - "80:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:Gm7Mgvfbmhjx9IcVUtDm@projectopdracht.cz88w0mccllr.us-east-1.rds.amazonaws.com/postgres
      - QUEUE_URL=https://sqs.us-east-1.amazonaws.com/058264264638/dries-projectopdracht
      - BUCKET=dries-projectopdracht-ict
      - REGION=us-east-1
    volumes:
      - /home/ec2-user/.aws/credentials:/root/.aws/credentials:ro
    
  img-resize:
    image: img-resize
    restart: unless-stopped
    environment:
      - QUEUE_URL=https://sqs.us-east-1.amazonaws.com/058264264638/dries-projectopdracht
      - BUCKET=dries-projectopdracht-ict
      - REGION=us-east-1
    volumes:
      - /home/ec2-user/.aws/credentials:/root/.aws/credentials:ro
```

Herstart de containers:
> docker-compose down

> docker-compose up -d

En probeer opnieuw.