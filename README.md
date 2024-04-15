# 23-24-ICT-architecture-casus

## Ontwikkeling met DevContainer

Deze repository bevat een devcontainer configuratie. Open deze folder in VSCode in een devcontainer. 

## Ontwikkeling zonder container

Zorg dat je NodeJS 20+ hebt geïnstalleerd. Wil je de databank lokaal draaien, maak dan een `docker-compose.yml` bestand aan waarin je een Postgres configuratie aanmaakt. Voor meer informatie, zie de `./.devcontainer/docker-compose.yml` file.

## Verschillende onderdelen

De repository bevat 3 onderdelen:
* *app*: front-end en back-end voor het draaien van de media beheerstoepassing.
* *content-moderator*: bevat code voor het labelen van afbeeldingen via AWS Rekognition
* *img-resize*: herschaal en herencodeer afbeeldingen om ze om te zetten naar standaard groottes.  