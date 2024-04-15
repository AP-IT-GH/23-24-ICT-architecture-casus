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

/**
 * This function is triggered by an SQS message. The message contains the id of the image to be resized, the sizes to resize to, and the quality of the resized image.
 * @returns 
 */
module.exports.handler = async (event, context) => {
    console.log('Inside img-resize function');


    for (let record of event.Records) {
        const { objectKey, sizes, quality } = JSON.parse(record.body);
            
        try {
            await resizeImage(objectKey, sizes, quality);
        } catch (err) {
            console.log(err);
            return context.fail(`Error resizing image ${objectKey}`);
        }
    }
    return context.succeed(`Resized ${event.Records.length} images successfully`);

};

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