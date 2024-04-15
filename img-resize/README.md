# Image resize functie

Deze functie verwerkt berichten van een SQS queue. 

Om de functie lokaal te testen, maak een `.env` bestand aan met volgende variabelen:
* BUCKET: naam van je S3 bucket.
* REGION: AWS region van je S3 bucket.
* ACCESS_KEY_ID: Indien je met een access key werkt. Optioneel.
* SECRET_ACCESS_KEY: Indien je met een access key werkt. Optioneel.
* SESSION_TOKEN: Indien je met een access key en session token werkt. Optioneel.

Maak vervolgens een bestand `payload.json` aan waarin je volgend JSON document aanmaakt. 
```json
{
    "objectKey": "key", 
    "sizes": "large,640x360",
    "quality": 85
}
```

Vervang de waarde van de objectKey met je eigen object key.

## Deployment instructies

> **Requirements**: Docker. Om de image lokaal te builden en naar ECR te pushen, heb je Docker nodig. Installatieinstructies: [official documentation](https://docs.docker.com/get-docker/).

Om de service te deployen: zet je AWS credentials als environment variables.

```
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-key-here>
export AWS_SESSION_TOKEN=<your-session-token-here>
```

1. Log aan op je ECR repository. Log hiervoor aan op ECR.
2. Build, tag en push je container image.
3. Zet nu je Lambda functie op met deze container image. Opgelet: zorg dat de processorarchitectuur van de lambda functie gelijk is aan de processor architectuur van je container image.
