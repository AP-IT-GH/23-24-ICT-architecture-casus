const {S3Client,GetObjectCommand, PutObjectCommand} = require('@aws-sdk/client-s3');
const { readFileSync } = require('fs');

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

async function uploadToS3(filePath, key) {
    const putObjectCommand = new PutObjectCommand({
        Body: readFileSync(filePath),
        Bucket: bucket,
        ContentType: 'image/jpeg',
        Key: key,
    });
    
    console.log('putting object to s3', bucket, key, filePath);
    await s3.send(putObjectCommand);

}

async function downloadFromS3(key) {
    const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    console.log('getting object from s3', bucket, key)
    const {Body} = await s3.send(getObjectCommand);
    return Body;
}


module.exports = {
    uploadToS3,
    downloadFromS3,
}