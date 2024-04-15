const express = require('express');
const apiRoute = require('./api.route');

const app = express();

app.use('/api', apiRoute);

app.use(express.static('public'));



app.listen(3000, () => {
    console.log('Upload app listening on port 3000!');
});
