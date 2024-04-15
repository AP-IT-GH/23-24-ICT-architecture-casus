const {handler} = require('./app');

const context = {
    succeed: (msg) => {
        console.log('context.succeed', msg);
    },
    fail: (msg) => {
        console.log('context.fail', msg);
    }
}

// read json from payload.json
const payload = require('./payload.json');


handler({Records: [{body: JSON.stringify(payload)}]}, context);