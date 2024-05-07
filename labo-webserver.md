# Labo 

In dit labo zetten we de webserver op, versturen we een bericht wanneer een nieuw bestand wordt opgeladen, en verwerken we het bericht. Het labo bestaat uit 4 delen.
1. Resources aanmaken
2. Webserver opzetten
3. Bericht verzenden naar Queue
4. Bericht verwerken van Queue

## Deel 1: Resources aanmaken

We maken volgende resources aan: 
1. S3 Bucket
2. RDS Postgres database
3. SQS queue

### S3 Bucket
Ga naar de service **S3** (Simple Storage Service) en maak een nieuwe Bucket aan. Accepteer alle standaard instellingen.

Zorg ervoor dat de naam van de Queue globaal uniek is. Begin de naam van de bucket bv. met een datum, of je voornaam of een random set van alfanumerieke karakters.

Noteer de naam van je Bucket.

### RDS Postgres database
Ga naar de service **RDS** (Relational Data Service) en maak een nieuwe database aan. Kies voor *Postgres* als database platform en neem de optie dev/test ? . Kies een naam voor je instantie. Gebruik de **free tier** instance type. Laat RDS zelf een wachtwoord kiezen. Zorg ervoor dat de instantie **niet** publiek beschikbaar is.

Nadat je de wizard hebt vervolledigd, wordt de instantie aangemaakt. Klik rechts bovenaan het scherm op de knop om je wachtwoord op te halen.

Nu kan het even duren vooraleer de instantie geprovisioned is. Wanneer dit het geval is, verschijnt de URL van de instantie. Noteer deze URL. 

### SQS queue
Gaa naar de service **SQS** (Simple Queue Service) en maak een nieuwe queue aan. Accepteer alle standaard instellingen. Geef de queue een naam. Deze naam is specifiek voor jouw account.

Noteer de QUEUE URL van je Queue.

## Deel 2: Webserver opzetten

We connecteren naar Cloud9. Maak een nieuwe omgeving of herbruik de bestaande.

### Git repository clonen

Clone de GitHub repository vanuit GitHub Classroom. Voor de demo gebruik ik de template repository `https://github.com/AP-IT-GH/23-24-ICT-architecture-casus`. Het is belangrijk dat je je eigen repository gebruikt, zo kan je je wijzigingen committen en pushen naar je repository. 

1. Maak in je Cloud9 omgeving een SSH sleutel aan
> ssh-keygen -t ed25519
2. Kopiëer de inhoud van de publieke sleutel
> cat ~/.ssh/id_ed25519.pub
3. Ga naar de instellingen van je repository. Settings > Deploy keys.
4. Kopiëer de inhoud van de sleutel.
5. Check of je een connectie kan maken
> ssh git@github.com
6. Clone de ssh link van je repository in de `./environment` folder
> git clone git@github.com/...

Vervolgens ga je naar het geclonede project.

Installeer nu de dependencies van het Nodejs web project project. Voer uit in de `./app` folder:

```bash
npm install
```

### Environment variabelen instellen

Maak volgend bestand `.env` aan in de `./app` folder van je opdracht en vul de variabele stukken in.

```
DATABASE_URL=postgresql://postgres:<postgres wachtwoord>@<postgres host dns adres>/postgres
QUEUE_URL=<url van je queue>
BUCKET=<naam van je bucket>
REGION=us-east-1
```

### Test: webserver opstarten

We starten de webserver op met volgend commando:

```bash
npm start
```

Check of de webserver opstart door in een andere terminal een curl opdracht te geven:
```bash
curl http://localhost:3000 
```

Wat gebeurt er?

### Database toegang configureren
De website maakt achterliggend een connectie naar de RDS databank. Deze configuratie moet dus correct zijn en de connectie aangemaakt zijn alvorens we verder kunnen. 

Maak een nieuwe Firewall regel aan door naar **Security groups** binnen **EC2** (Elastic Compute Cloud) te gaan. Maak een nieuwe Security group aan: **database-postgres**. Inbound regels: Postgres (5432). Alle IP4 adressen toegelaten. Outbound regels: laat deze staan.

Ga naar **RDS** en kies je instantie om het detail te openen. Klik op *Modify*. Zoek nu naar het onderdeel *connectivity* en voeg de Firewall regel (Security group) toe die je zonet gemaakt hebt. Ga verder en kies om meteen uit te voeren.

Een connectie naar RDS vereist een beveiligde connectie. Hiervoor moeten we volgende code wijziging aanbrengen in het bestand `postgres.js`. 

```javascript
const pool = new pg.Pool({connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
    }
});
```

### Test: webserver publiek beschikbaar?

Ga naar de service **EC2** (Elastic Compute Cloud) en haal het publiek IP adres op van de Cloud9 Instantie. Surf naar de url `http://<ipadres>:3000`. Krijg je een resultaat?

Maak een nieuwe Firewall regel aan door naar **Security groups** te gaan. Maak een nieuwe Security group aan: **webserver-3000**. Inbound regels: TCP poort 3000. Alle IP4 adressen toegelaten. Outbound regels: laat deze staan.

Ga naar Instances binnen **EC2** en klik op de Instance-id om het detail te openen. Klik rechts bovenaan op acties - Security - Security groups. Voeg de security group toe die je zonet gemaakt had. 

## Deel 3: Bericht verzenden naar Queue

Voeg de SQS client library toe.

```bash
npm install @aws-sdk/client-sqs
```

Maak een nieuw bestand `sqs.js` in de `./src` folder en plak volgende code.

```javascript
const { SendMessageCommand, SQSClient } = require("@aws-sdk/client-sqs");

const client = new SQSClient({});
const queueUrl = process.env.QUEUE_URL;

async function sendMessage(obj) {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(obj)
  });

  const response = await client.send(command);
  console.log(response);
  return response;
};

module.exports = {
    sendMessage,
}

```

Deze code haalt de QUEUE_URL environment variabele op, serialiseert het javascript object naar JSON en verstuurt het bericht naar de SQS queue.

Pas het bestand `./src/api.route.js` aan. Voeg volgende stukken toe.

> `const { sendMessage} = require('./sqs');`

> `await sendMessage({id})`.

Het resultaat ziet er dan als volgt uit:

```javascript
const {Router} = require('express');
const multer = require('multer');
const upload = multer({dest: '../files/'}).single('file');
const {createUpload, getUpload, getUploads, deleteUpload} = require('./postgres');
//const {createUpload, getUpload, getUploads, deleteUpload} = require('./in-memory');
const {uploadToS3, downloadFromS3} = require('./s3');
const { sendMessage} = require('./sqs');
```

en 

```javascript
router.post('/uploads', upload, async (req, res) => {
    const {filename} = req.body
    const {mimetype, size} = req.file;
    const {id} = await createUpload(mimetype, size, filename);

    await uploadToS3(req.file.path, id.toString());
    await sendMessage({id})
    res.json({id});
});
```

Start de webserver opnieuw op.

## Deel 4: Bericht verwerken van Queue

We gaan nu de berichten verwerken door middel van Long-Polling. Zie [de AWS docs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html) voor meer informatie. Hiervoor zullen we de bestanden in de `./img-resize` folder aanpassen. 

### Vooraf

Voeg de client dependency toe.

```bash
npm install @aws-sdk/client-sqs
```

Pas het start script aan in de `package.json` file zodat het index.js uitvoert.

Het `package.json` bestand ziet er dan als volgt uit dan:
```json
{
  "name": "img-resize",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "nodemon -r dotenv/config index.js"
  },
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "dotenv": "^16.0.3",
    "nodemon": "^2.0.22"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.554.0",
    "@aws-sdk/client-sqs": "^3.568.0",
    "sharp": "^0.33.3"
  }
}
```

Kopiëer het bestand `.env` vanuit de app folder in de img-resize folder.

Hernoem het bestand `test.js` naar `index.js` en vervang de code door:

```javascript
// Importeer de benodigde AWS SDK clients en commands
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");

// AWS SQS client configuratie
const sqsClient = new SQSClient({ });

const {resizeImage} = require('./resize');

// De URL van jouw SQS queue
const queueUrl = process.env.QUEUE_URL;


// Functie om berichten van SQS te ontvangen en te verwerken
async function pollMessages() {
    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,  // Aantal berichten om in één keer te ontvangen
        WaitTimeSeconds: 20       // Long polling interval
    };

    try {
        const data = await sqsClient.send(new ReceiveMessageCommand(params));
        if (data.Messages && data.Messages.length > 0) {
            for (const message of data.Messages) {
                
                const sizes = 'large,medium,640x360';
                const obj = JSON.parse(message.Body)
                
                await resizeImage(obj.id.toString(), sizes);
                console.log(`Bericht ${obj.id} verwerkt`);

                // Verwijder het bericht na verwerking
                const deleteParams = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: message.ReceiptHandle
                };
                await sqsClient.send(new DeleteMessageCommand(deleteParams));
            }
        } else {
            console.log("Geen nieuwe berichten beschikbaar.");
        }
    } catch (err) {
        console.error("Er is een fout opgetreden:", err);
    }
}

// Start de polling loop
setInterval(pollMessages, 30000);  // Poll elke 30 seconden
console.log('starting polling')
```

Pas de inhoud van het bestand `resize.js` aan als volgt:

```javascript
'use strict';

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const bucket = process.env.BUCKET;
const region = process.env.REGION;

const s3 = new S3Client({
    region,
    credentials: process.env.ACCESS_KEY_ID ? {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        sessionToken: process.env.SESSION_TOKEN
    } : null,
});


async function resizeImage(objectKey, sizes, quality = 70) {
    const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
    });

    console.log('getting object from s3', bucket, objectKey)
    const { Body } = await s3.send(getObjectCommand);
    const originalImage = await streamToBuffer(Body);

    const input = await sharp(originalImage);
    const metadata = await input.metadata();

    for (let size of sizes.split(',')) {

        const {width, height} = getNewDimensions(metadata, size)

        const resizedImage = await input
            .resize(Math.round(width), Math.round(height))
            .toFormat('jpeg', { quality })
            .toBuffer();

        const key = `${objectKey.split('.')[0]}-resized-${size}.jpg`;
        const putObjectCommand = new PutObjectCommand({
            Body: resizedImage,
            Bucket: bucket,
            ContentType: 'image/jpeg',
            Key: key,
        });

        console.log('putting object to s3', bucket, key);
        await s3.send(putObjectCommand);
    }
}

function getNewDimensions(metadata, size) {
    let { newWidth, newHeight } = getDimensions(size);
    const { width, height } = metadata;
    if (!width || !height) throw new Error('Invalid image');

    const ratio = width / height;

    if (newWidth > width) {
        newWidth = width;
        newHeight = height;
    } else if (newHeight > height) {
        newWidth = width;
        newHeight = height;
    } else {
        if (ratio > 1) {
            newHeight = newWidth / ratio;
        } else {
            newWidth = newHeight * ratio;
        }
    }

    return { width: newWidth, height: newHeight }
}

function getDimensions(size) {
    console.log('getDimensions', size)
    switch (size) {
        case 'large':
            return { newWidth: 1920, newHeight: 1080 };
        case 'medium':
            return { newWidth: 1280, newHeight: 720 };
        case 'small':
            return { newWidth: 640, newHeight: 360 };
        default:
            const [newWidth, newHeight] = size.split('x').map(Number);
            return { newWidth, newHeight };
    }
}

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

module.exports = {
    resizeImage
};
```

Voer het project uit:

```bash
npm run start
```